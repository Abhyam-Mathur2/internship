<?php

namespace App\Services;

class PayrollVerificationService
{
    public function verify(array $p): array
    {
        $earnings = $this->sum($p, ['basic_salary', 'hra', 'allowances', 'bonus', 'overtime']);
        $deductions = $this->sum($p, ['pf', 'esi', 'tds', 'other_deductions']);
        $gross = (float) ($p['gross_salary'] ?? 0);
        $net = (float) ($p['net_salary'] ?? 0);
        $basic = (float) ($p['basic_salary'] ?? 0);
        $expectedPf = round($basic * config('payroll.pf_rate'), 2);
        $expectedEsi = $gross <= config('payroll.esi_wage_limit') ? round($gross * config('payroll.esi_employee_rate'), 2) : 0;

        $warnings = [];
        if (abs($earnings - $gross) > 1) {
            $warnings[] = "Gross salary mismatch: expected {$earnings}, found {$gross}.";
        }
        if (abs(($gross - $deductions) - $net) > 1) {
            $warnings[] = "Net salary mismatch: expected ".($gross - $deductions).", found {$net}.";
        }
        if (abs(((float) ($p['pf'] ?? 0)) - $expectedPf) > max(100, $expectedPf * 0.05)) {
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
}

