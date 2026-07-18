<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GroqService
{
    public function analyzePayroll(array $payroll, array $verification, ?string $rawText = null, ?array $previousPayroll = null): array
    {
        if (!config('payroll.groq_api_key')) {
            return $this->fallbackAnalysis($verification);
        }

        try {
            $response = Http::withoutVerifying()
                ->withToken(config('payroll.groq_api_key'))
                ->acceptJson()
                ->asJson()
                ->timeout(30)
                ->retry(2, 250)
                ->post('https://api.groq.com/openai/v1/chat/completions', [
                    'model' => config('payroll.groq_model', 'llama-3.3-70b-versatile'),
                    'temperature' => 0.1,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are an expert forensic payroll auditor specializing in Indian statutory compliance and mathematical verification.
Perform a step-by-step calculation check on the uploaded payslip details.

When auditing, you MUST evaluate these critical areas:
1. LAYOUT DISTORTION: OCR engines frequently flatten two-column tables (Earnings on the left, Deductions on the right) horizontally into a single line. This can mix up values (e.g. Basic Salary: 50000 PF: 1800). Cross-verify values before reporting anomalies.
2. INDIAN EPF COMPLIANCE CEILING: The standard mandatory Employee Provident Fund (EPF) contribution ceiling is capped at a wage threshold of ₹15,000 per month, which limits the standard mandatory contribution to ₹1,800 per month (12% of ₹15,000). Contributions exceeding ₹1,800 are voluntary and fully compliant. DO NOT flag contributions as non-compliant or mismatch errors if they are capped at ₹1,800 or match 12% of the actual basic salary.
3. ARITHMETIC AUDIT:
   - Verify: Gross Salary = Basic + HRA + Allowances + Bonus + Overtime.
   - Verify: Net Salary = Gross Salary - Total Deductions.
4. ESI & TDS VALIDATION: Ensure ESI contributions are only expected if gross salary is <= ₹21,000. Verify TDS ranges look reasonable.
5. PROJECTIONS & TAX ADVISORY: Calculate and project annual salaries, Indian tax slabs under both regimes (Old vs New), suggest optimization tips, and project 5/10 year EPF accumulations (assume 8.25% interest rate and matching employer contribution).
6. MONTH-ON-MONTH COMPARISON: If previous_payroll_data is provided in the user input, compare it side-by-side with the current month. Identify any shady or suspicious changes:
   - Basic salary changed suddenly.
   - Deductions (PF, TDS, ESI) fluctuated suspiciously.
   - Allowances added or removed without clear explanation.
   List your forensic audit observations in the "comparison_findings" list. If no previous month data is provided, leave "comparison_findings" as an empty array.

Return ONLY a valid JSON object matching the following structure:
{
  "summary": "High level audit verdict summary.",
  "deduction_explanation": "Breakdown/explanation of deductions.",
  "anomalies": ["List of calculations/statutory mismatch statements."],
  "issues": ["List of compliance, missing info, or formatting issues."],
  "recommendations": ["Actionable compliance recommendations."],
  "risk_indicators": ["Key risk identifiers found."],
  "comparison_findings": ["List of shady or notable variations compared to the previous month."],
  "projections": {
    "annual_gross_salary": number,
    "annual_net_salary": number,
    "new_regime_tax": number,
    "old_regime_tax": number,
    "recommended_regime": "New Tax Regime" or "Old Tax Regime",
    "tax_optimization_tips": ["List of tax saving tips."],
    "epf_forecast_5_years": number,
    "epf_forecast_10_years": number
  }
}',
                        ],
                        [
                            'role' => 'user',
                            'content' => json_encode([
                                'task' => 'Audit this payslip data and raw text. Cross-check math, statutory limits, and layout distortions. Compare against the previous month\'s data if provided. Return compliance verdict in JSON.',
                                'parsed_payroll_fields' => $payroll,
                                'rule_verification' => $verification,
                                'raw_ocr_text' => $rawText,
                                'previous_payroll_data' => $previousPayroll,
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
