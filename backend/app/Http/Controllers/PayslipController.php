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

        $payroll = $payslip->extracted_data ?: [];
        $verification = $verifier->verify($payroll);
        $ai = $groq->analyzePayroll($payroll, $verification, $payslip->ocr_text);

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
}
