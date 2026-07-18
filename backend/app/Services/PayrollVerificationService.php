<?php

namespace App\Services;

use App\Models\AuditReport;
use App\Models\Employee;
use App\Models\Payslip;

class PayrollVerificationService
{
    public function verify(array $p): array
    {
        $earnings = $this->sum($p, ['basic_salary', 'hra', 'allowances', 'bonus', 'overtime']);
        $deductions = $this->sum($p, ['pf', 'esi', 'tds', 'other_deductions']);
        $gross = (float) ($p['gross_salary'] ?? 0);
        $net = (float) ($p['net_salary'] ?? 0);
        
        $basic = (float) ($p['basic_salary'] ?? 0);
        
        // EPF Statutory Limit Compliance: Cap standard expected PF calculation at ₹15,000 basic salary
        $pfBase = min($basic, 15000.0);
        $expectedPf = round($pfBase * config('payroll.pf_rate', 0.12), 2);
        
        // Voluntary uncapped expected PF for validation allowance
        $expectedPfUncapped = round($basic * config('payroll.pf_rate', 0.12), 2);
        
        $expectedEsi = $gross <= config('payroll.esi_wage_limit', 21000) 
            ? round($gross * config('payroll.esi_employee_rate', 0.0075), 2) 
            : 0;

        $warnings = [];
        if (abs($earnings - $gross) > 1) {
            $warnings[] = "Gross salary mismatch: expected {$earnings}, found {$gross}.";
        }
        if (abs(($gross - $deductions) - $net) > 1) {
            $warnings[] = "Net salary mismatch: expected " . ($gross - $deductions) . ", found {$net}.";
        }
        
        // Accept either capped EPF contribution OR voluntary uncapped contribution
        $declaredPf = (float) ($p['pf'] ?? 0);
        $diffCapped = abs($declaredPf - $expectedPf);
        $diffUncapped = abs($declaredPf - $expectedPfUncapped);
        
        $toleranceCapped = max(100.0, $expectedPf * 0.05);
        $toleranceUncapped = max(100.0, $expectedPfUncapped * 0.05);

        if ($diffCapped > $toleranceCapped && $diffUncapped > $toleranceUncapped) {
            $warnings[] = "PF differs from expected value {$expectedPf}.";
        }
        
        if (abs(((float) ($p['esi'] ?? 0)) - $expectedEsi) > 50) {
            $warnings[] = "ESI differs from expected value {$expectedEsi}.";
        }
        if (($p['paid_days'] ?? 0) > ($p['working_days'] ?? 0) && ($p['working_days'] ?? 0) > 0) {
            $warnings[] = 'Paid days exceed working days.';
        }

        return [
            'computed_gross_salary' => round($earnings, 2),
            'computed_total_deductions' => round($deductions, 2),
            'computed_net_salary' => round($gross - $deductions, 2),
            'expected_pf' => $expectedPf,
            'expected_esi' => $expectedEsi,
            'deduction_percentage' => $gross > 0 ? round(($deductions / $gross) * 100, 2) : 0,
            'tax_percentage' => $gross > 0 ? round(((float) ($p['tds'] ?? 0) / $gross) * 100, 2) : 0,
            'warnings' => $warnings,
        ];
    }

    public function verifyAgainstCompensationPlan(array $payroll, Employee $employee): array
    {
        $plan = $employee->compensation_plan_data ?? [];
        $ctc = (float) ($plan['ctc'] ?? $employee->ctc ?? 0);
        $cashInHand = (float) ($plan['cash_in_hand'] ?? $employee->cash_in_hand ?? 0);
        $pf = (float) ($plan['pf'] ?? 0);
        $sharesHeld = (float) ($plan['shares_held'] ?? 0);

        $expectedMonthlyCtc = $ctc > 0 ? round($ctc / 12, 2) : 0;
        $actualGross = (float) ($payroll['gross_salary'] ?? 0);
        $actualNet = (float) ($payroll['net_salary'] ?? 0);
        $actualPf = (float) ($payroll['pf'] ?? 0);

        $checks = [];
        if ($expectedMonthlyCtc > 0) {
            $checks[] = $this->planCheck('Monthly CTC / gross salary', $expectedMonthlyCtc, $actualGross, 0.08);
        }
        if ($cashInHand > 0) {
            $checks[] = $this->planCheck('Cash in hand / net salary', $cashInHand, $actualNet, 0.05);
        }
        if ($pf > 0) {
            $expectedMonthlyPf = $pf > 10000 ? round($pf / 12, 2) : $pf;
            $checks[] = $this->planCheck('PF deduction', $expectedMonthlyPf, $actualPf, 0.05);
        }

        $warnings = array_values(array_map(
            fn ($check) => $check['message'],
            array_filter($checks, fn ($check) => !$check['matches'])
        ));

        return [
            'has_plan' => $ctc > 0 || $cashInHand > 0 || $pf > 0 || $sharesHeld > 0,
            'plan_filename' => $employee->compensation_plan_filename,
            'expected_annual_ctc' => $ctc,
            'expected_monthly_ctc' => $expectedMonthlyCtc,
            'expected_cash_in_hand' => $cashInHand,
            'expected_pf' => $pf,
            'shares_held' => $sharesHeld,
            'actual_gross_salary' => $actualGross,
            'actual_net_salary' => $actualNet,
            'actual_pf' => $actualPf,
            'checks' => $checks,
            'warnings' => $warnings,
            'summary' => $warnings
                ? 'Salary needs review against the saved compensation plan.'
                : ($checks ? 'Salary matches the saved compensation plan within tolerance.' : 'Upload or enter compensation plan details to verify salary correctness.'),
        ];
    }

    public function score(array $payroll, array $verification, array $ai): int
    {
        $score = 100;
        $score -= count($verification['warnings'] ?? []) * 10;
        $score -= count($ai['issues'] ?? []) * 6;

        foreach (['employee_name', 'employee_id', 'month', 'gross_salary', 'net_salary'] as $field) {
            if (empty($payroll[$field])) {
                $score -= 5;
            }
        }

        if (($verification['deduction_percentage'] ?? 0) > 45) {
            $score -= 12;
        }

        return max(0, min(100, $score));
    }

    public function riskLevel(int $score): string
    {
        return match (true) {
            $score >= 80 => 'low',
            $score >= 60 => 'medium',
            default => 'high',
        };
    }

    private function sum(array $payroll, array $keys): float
    {
        return array_reduce($keys, fn ($sum, $key) => $sum + (float) ($payroll[$key] ?? 0), 0.0);
    }

    private function planCheck(string $label, float $expected, float $actual, float $toleranceRatio): array
    {
        $tolerance = max(100.0, abs($expected) * $toleranceRatio);
        $difference = round($actual - $expected, 2);
        $matches = abs($difference) <= $tolerance;

        return [
            'label' => $label,
            'expected' => round($expected, 2),
            'actual' => round($actual, 2),
            'difference' => $difference,
            'matches' => $matches,
            'message' => $matches
                ? "{$label} matches expected value."
                : "{$label} differs by {$difference}. Expected {$expected}, received {$actual}.",
        ];
    }
}
