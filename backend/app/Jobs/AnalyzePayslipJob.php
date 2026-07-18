<?php

namespace App\Jobs;

use App\Models\Payslip;
use App\Services\GroqService;
use App\Services\PayrollVerificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AnalyzePayslipJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public Payslip $payslip)
    {
    }

    public function handle(PayrollVerificationService $verifier, GroqService $groq): void
    {
        $payroll = $this->payslip->extracted_data ?: [];
        $verification = $verifier->verify($payroll);
        $ai = $groq->analyzePayroll($payroll, $verification, $this->payslip->ocr_text);
        $score = $verifier->score($payroll, $verification, $ai);

        $this->payslip->report()->updateOrCreate([], [
            'audit_score' => $score,
            'risk_level' => $verifier->riskLevel($score),
            'verification' => $verification,
            'issues' => $ai['issues'] ?? [],
            'recommendations' => $ai['recommendations'] ?? [],
            'ai_analysis' => $ai,
        ]);
    }
}

