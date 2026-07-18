<?php

namespace App\Http\Controllers;

use App\Models\AuditReport;
use App\Models\Employee;
use App\Models\Payslip;
use App\Services\GroqService;
use App\Services\OcrService;
use App\Services\PayrollVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PayslipController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $maxKb = config('payroll.max_upload_kb');
        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.$maxKb, 'mimes:pdf,jpg,jpeg,png'],
        ]);

        $employee = $this->employeeFor($request);
        $file = $data['file'];
        $path = $file->store('payslips/'.$employee->id);

        $payslip = Payslip::query()->create([
            'employee_id' => $employee->id,
            'file_path' => $path,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'file_size' => $file->getSize(),
            'status' => 'uploaded',
        ]);

        return response()->json(['payslip' => $payslip], 201);
    }

    public function extract(Request $request, OcrService $ocr): JsonResponse
    {
        $data = $request->validate([
            'payslip_id' => ['required', Rule::exists('payslips', 'id')],
        ]);

        $payslip = $this->ownedPayslip($request, (int) $data['payslip_id']);
        $result = $ocr->extract(Storage::path($payslip->file_path), $payslip->mime_type);

        $payslip->update([
            'ocr_text' => $result['raw_text'],
            'extracted_data' => $result['data'],
            'month' => $result['data']['month'] ?? null,
            'gross_salary' => $result['data']['gross_salary'] ?? 0,
            'net_salary' => $result['data']['net_salary'] ?? 0,
            'status' => 'extracted',
        ]);

        return response()->json(['payslip' => $payslip->fresh(), 'extraction' => $result]);
    }

    public function analyze(Request $request, PayrollVerificationService $verifier, GroqService $groq): JsonResponse
    {
        $data = $request->validate([
            'payslip_id' => ['required', Rule::exists('payslips', 'id')],
        ]);

        $payslip = $this->ownedPayslip($request, (int) $data['payslip_id']);
        if (empty($payslip->extracted_data)) {
            $ocr = app(OcrService::class);
            $result = $ocr->extract(Storage::path($payslip->file_path), $payslip->mime_type);
            $payslip->update([
                'ocr_text' => $result['raw_text'],
                'extracted_data' => $result['data'],
                'month' => $result['data']['month'] ?? null,
                'gross_salary' => $result['data']['gross_salary'] ?? 0,
                'net_salary' => $result['data']['net_salary'] ?? 0,
                'status' => 'extracted',
            ]);
            $payslip = $payslip->fresh();
        }

        $payroll = $payslip->extracted_data ?? [];
        $verification = $verifier->verify($payroll);
        $planVerification = $verifier->verifyAgainstCompensationPlan($payroll, $payslip->employee);

        // Retrieve the most recent previous payslip for this employee, if any
        $previousPayslip = Payslip::query()
            ->where('employee_id', $payslip->employee_id)
            ->where('id', '<>', $payslip->id)
            ->whereNotNull('extracted_data')
            ->orderBy('created_at', 'desc')
            ->first();
        $previousPayroll = $previousPayslip ? $previousPayslip->extracted_data : null;
        $comparison = $this->comparePayroll($payroll, $previousPayslip);

        // Pass the previous payroll data to the Groq analysis for month‑on‑month comparison
        $ai = $groq->analyzePayroll($payroll, $verification, $payslip->ocr_text, $previousPayroll);
        $ai['comparison'] = $comparison;
        $ai['compensation_plan'] = $planVerification;
        if ($comparison['has_previous']) {
            $ai['comparison_findings'] = $comparison['findings'];
        }
        if (!empty($planVerification['warnings'])) {
            $ai['issues'] = array_values(array_merge($ai['issues'] ?? [], $planVerification['warnings']));
        }
        $score = $verifier->score($payroll, $verification, $ai);
        $risk = $verifier->riskLevel($score);

        $report = AuditReport::query()->updateOrCreate(
            ['payslip_id' => $payslip->id],
            [
                'audit_score' => $score,
                'risk_level' => $risk,
                'verification' => $verification,
                'issues' => $ai['issues'] ?? $verification['warnings'] ?? [],
                'recommendations' => $ai['recommendations'] ?? [],
                'ai_analysis' => $ai,
            ]
        );

        $payslip->update(['status' => 'analyzed']);

        return response()->json(['report' => $report->load('payslip.employee'), 'payslip' => $payslip->fresh()]);
    }

    private function employeeFor(Request $request): Employee
    {
        return Employee::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['employee_name' => $request->user()->name]
        );
    }

    private function ownedPayslip(Request $request, int $id): Payslip
    {
        $query = Payslip::query()->with('employee.user')->whereKey($id);
        if ($request->user()->role !== 'admin') {
            $query->whereHas('employee', fn ($q) => $q->where('user_id', $request->user()->id));
        }

        return $query->firstOrFail();
    }

    private function comparePayroll(array $currentPayroll, ?Payslip $previousPayslip): array
    {
        if (!$previousPayslip || empty($previousPayslip->extracted_data)) {
            return [
                'has_previous' => false,
                'previous_payslip_id' => null,
                'previous_month' => null,
                'current_month' => $currentPayroll['month'] ?? null,
                'findings' => [],
            ];
        }

        $previousPayroll = $previousPayslip->extracted_data;
        $fields = [
            'basic_salary' => 'Basic salary',
            'hra' => 'HRA',
            'allowances' => 'Allowances',
            'bonus' => 'Bonus',
            'overtime' => 'Overtime',
            'pf' => 'PF',
            'esi' => 'ESI',
            'tds' => 'TDS',
            'other_deductions' => 'Other deductions',
            'gross_salary' => 'Gross salary',
            'net_salary' => 'Net salary',
            'working_days' => 'Working days',
            'paid_days' => 'Paid days',
        ];

        $findings = [];
        foreach ($fields as $field => $label) {
            $previous = (float) ($previousPayroll[$field] ?? 0);
            $current = (float) ($currentPayroll[$field] ?? 0);

            if (abs($current - $previous) > 1) {
                $findings[] = "{$label} changed from ".$this->formatComparisonValue($previous).' to '.$this->formatComparisonValue($current).'.';
            }
        }

        if (($previousPayroll['month'] ?? null) !== ($currentPayroll['month'] ?? null)) {
            $findings[] = 'Payroll month changed from '.($previousPayroll['month'] ?? 'unknown').' to '.($currentPayroll['month'] ?? 'unknown').'.';
        }

        if (empty($findings)) {
            $findings[] = 'No changes detected between the current and previous extracted payroll data.';
        }

        return [
            'has_previous' => true,
            'previous_payslip_id' => $previousPayslip->id,
            'previous_filename' => $previousPayslip->original_filename,
            'previous_month' => $previousPayroll['month'] ?? $previousPayslip->month,
            'current_month' => $currentPayroll['month'] ?? null,
            'findings' => $findings,
        ];
    }

    private function formatComparisonValue(float $value): string
    {
        return number_format($value, 2, '.', '');
    }
}
