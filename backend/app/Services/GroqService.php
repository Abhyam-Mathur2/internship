<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GroqService
{
    public function analyzePayroll(array $payroll, array $verification, ?string $rawText = null): array
    {
        if (!config('payroll.groq_api_key')) {
            return $this->fallbackAnalysis($verification);
        }

        try {
            $response = Http::withToken(config('payroll.groq_api_key'))
                ->acceptJson()
                ->asJson()
                ->timeout(30)
                ->retry(2, 250)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => config('payroll.groq_model'),
                    'temperature' => 0.2,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a professional payroll auditor. Your task is to audit the payslip. You MUST look for errors, inconsistencies, or compliance issues (such as PF/TDS anomalies, arithmetic mismatches, or missing statutory elements). In India, Provident Fund (PF) is legally calculated as 12% of (Basic Salary + Dearness Allowance). If Dearness Allowance (DA) is paid but PF is only 12% of Basic, flag this as a compliance issue. Be strict and identify any potential issues or concerns. Return only valid JSON with keys summary, deduction_explanation, anomalies, issues, recommendations, risk_indicators.',
                        ],
                        [
                            'role' => 'user',
                            'content' => json_encode([
                                'task' => 'Audit the payslip. Double-check all arithmetic. Find any non-compliance or calculations that look suspicious. Explain deductions simply, list issues/anomalies, and provide actionable recommendations.',
                                'parsed_payroll_fields' => $payroll,
                                'rule_verification' => $verification,
                                'raw_ocr_text' => $rawText,
                            ], JSON_THROW_ON_ERROR),
                        ],
                    ],
                ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Groq Analysis Failed: ' . $e->getMessage(), ['exception' => $e]);
            return $this->fallbackAnalysis($verification);
        }

        if (!$response->successful()) {
            \Illuminate\Support\Facades\Log::error('Groq API Error: ' . $response->status() . ' - ' . $response->body());
            return $this->fallbackAnalysis($verification);
        }

        $content = data_get($response->json(), 'choices.0.message.content', '{}');
        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : $this->fallbackAnalysis($verification);
    }

    private function fallbackAnalysis(array $verification): array
    {
        $warnings = $verification['warnings'] ?? [];

        return [
            'summary' => empty($warnings)
                ? 'Payroll calculations are consistent based on extracted values.'
                : 'Payroll needs review because one or more calculation checks failed.',
            'deduction_explanation' => 'Deductions usually include PF, ESI, income tax/TDS, and other company-specific recoveries.',
            'anomalies' => $warnings,
            'issues' => $warnings,
            'recommendations' => empty($warnings)
                ? ['Keep a copy of this audited payslip for salary records.']
                : ['Ask payroll to clarify each mismatch before accepting the payslip as final.'],
            'risk_indicators' => empty($warnings) ? ['No major risk indicators found.'] : $warnings,
        ];
    }
}
