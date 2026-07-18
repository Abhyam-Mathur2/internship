<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Smalot\PdfParser\Parser;

class OcrService
{
    public function extract(string $path, string $mimeType): array
    {
        if (!is_file($path)) {
            throw new \RuntimeException('Payslip file is missing from storage.');
        }

        $rawText = '';

        // 1. Priority: If PDF, execute native text parsing first
        if ($mimeType === 'application/pdf') {
            $rawText = $this->extractPdfText($path);
        }

        // 2. If Groq API is available, use it for intelligent parsing
        $apiKey = config('payroll.groq_api_key') ?: env('GROQ_API_KEY');
        if ($apiKey) {
            $groqResult = $this->extractWithGroq($path, $mimeType, $rawText);
            if (!empty($groqResult) && !empty($groqResult['data']) && (float)($groqResult['data']['gross_salary'] ?? 0) > 0) {
                return $groqResult;
            }
        }

        // 3. Fall back to other OCR engines if Groq is not available or failed
        if (trim($rawText) === '') {
            $driver = config('payroll.ocr_driver');
            if ($driver === 'mock') {
                throw new \RuntimeException(
                    'OCR extraction failed. OCR_DRIVER=mock would return demo payslip data, so real uploads cannot be compared accurately. Configure Groq, Tesseract, or OCR.space OCR.'
                );
            }

            $rawText = match ($driver) {
                'tesseract' => $this->extractWithTesseract($path),
                'ocrspace' => $this->extractWithOcrSpace($path),
                default => '',
            };

            if (trim($rawText) === '') {
                throw new \RuntimeException('OCR extraction failed. No readable payroll text was extracted from the uploaded payslip.');
            }
        }

        // 4. Parse extracted data using strict regex rules if Groq was not available
        $data = $this->parsePayrollText($rawText);

        return [
            'raw_text' => $rawText ?: 'Extracted using local OCR.',
            'data' => $data,
        ];
    }

    public function extractCompensationPlan(string $path, string $mimeType): array
    {
        if (!is_file($path)) {
            throw new \RuntimeException('Compensation plan file is missing from storage.');
        }

        $rawText = '';
        if ($mimeType === 'application/pdf') {
            $rawText = $this->extractPdfText($path);
        }

        if (trim($rawText) === '') {
            $driver = config('payroll.ocr_driver');
            $rawText = match ($driver) {
                'tesseract' => $this->extractWithTesseract($path),
                'ocrspace' => $this->extractWithOcrSpace($path),
                default => '',
            };
        }

        return [
            'raw_text' => $rawText,
            'data' => $this->parseCompensationPlanText($rawText),
        ];
    }

    public function extractOffer(string $path, string $mimeType): array
    {
        if (!is_file($path) || !str_starts_with($mimeType, 'image/')) {
            throw new \RuntimeException('Please upload a valid offer-letter image.');
        }

        $rawText = '';
        $apiKey = config('payroll.groq_api_key') ?: env('GROQ_API_KEY');
        if ($apiKey) {
            try {
                $base64 = base64_encode(file_get_contents($path));
                $response = Http::withoutVerifying()->withToken($apiKey)->acceptJson()->asJson()->timeout(30)
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model' => config('payroll.groq_vision_model'), 'temperature' => 0.1,
                        'response_format' => ['type' => 'json_object'],
                        'messages' => [[
                            'role' => 'system',
                            'content' => 'You extract compensation values from an Indian job offer letter image. Return ONLY this JSON schema. Use annual values for ctc, bonus, stock_value and insurance_value; use monthly values for cash_in_hand, employee_pf and employer_pf. Use 0 when a value is not explicitly present: {"company_name":string|null,"designation":string|null,"ctc":number,"cash_in_hand":number,"employee_pf":number,"employer_pf":number,"bonus":number,"stock_value":number,"insurance_value":number,"joining_bonus":number}. Do not infer or invent values.'
                        ], [
                            'role' => 'user', 'content' => [
                                ['type' => 'text', 'text' => 'Extract only the compensation details explicitly stated in this offer letter.'],
                                ['type' => 'image_url', 'image_url' => ['url' => 'data:'.$mimeType.';base64,'.$base64]],
                            ],
                        ]],
                    ]);
                if ($response->successful()) {
                    $data = json_decode(data_get($response->json(), 'choices.0.message.content', '{}'), true);
                    if (is_array($data)) {
                        return ['raw_text' => 'Extracted via offer-letter image analysis.', 'data' => $this->sanitizeOfferData($data)];
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Offer extraction failed: '.$e->getMessage());
            }
        }

        $rawText = $this->extractWithTesseract($path);
        return ['raw_text' => $rawText, 'data' => $this->parseOfferText($rawText)];
    }

    private function extractPdfText(string $path): string
    {
        try {
            return (new Parser())->parseFile($path)->getText();
        } catch (\Throwable) {
            return '';
        }
    }

    private function extractWithTesseract(string $path): string
    {
        try {
            $binary = escapeshellcmd(config('payroll.tesseract_binary', 'tesseract'));
            $escapedPath = escapeshellarg($path);
            return shell_exec("$binary $escapedPath stdout 2>/dev/null") ?: '';
        } catch (\Throwable) {
            return '';
        }
    }

    private function extractWithOcrSpace(string $path): string
    {
        if (!config('payroll.ocr_space_api_key')) {
            return '';
        }

        try {
            $response = Http::attach('file', file_get_contents($path), basename($path))
                ->timeout(30)
                ->post(config('payroll.ocr_space_endpoint'), [
                    'apikey' => config('payroll.ocr_space_api_key'),
                    'language' => 'eng',
                    'isOverlayRequired' => 'false',
                ]);
        } catch (\Throwable) {
            return '';
        }

        return data_get($response->json(), 'ParsedResults.0.ParsedText', '');
    }

    private function extractWithGroq(string $path, string $mimeType, string $existingRawText): array
    {
        $apiKey = config('payroll.groq_api_key') ?: env('GROQ_API_KEY');
        if (!$apiKey) {
            return [];
        }

        if (trim($existingRawText) !== '') {
            try {
                $response = Http::withoutVerifying()
                    ->withToken($apiKey)
                    ->acceptJson()
                    ->asJson()
                    ->timeout(30)
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model' => 'llama-3.3-70b-versatile',
                        'temperature' => 0.1,
                        'response_format' => ['type' => 'json_object'],
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'You are a payroll details parser. Extract employee and salary breakdown fields from the provided raw payslip text. Return a JSON object matching this schema exactly: {"employee_name": string|null, "employee_id": string|null, "month": string|null, "basic_salary": number, "hra": number, "allowances": number, "bonus": number, "overtime": number, "pf": number, "esi": number, "tds": number, "other_deductions": number, "gross_salary": number, "net_salary": number, "working_days": number, "paid_days": number}. Ensure all number fields are numeric, not strings.',
                            ],
                            [
                                'role' => 'user',
                                'content' => $existingRawText,
                            ],
                        ],
                    ]);

                if ($response->successful()) {
                    $content = data_get($response->json(), 'choices.0.message.content', '{}');
                    $data = json_decode($content, true);
                    if (is_array($data) && (float)($data['gross_salary'] ?? 0) > 0) {
                        return [
                            'raw_text' => $existingRawText,
                            'data' => $this->sanitizeExtractedData($data),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Groq Text Parse Fallback Failed: ' . $e->getMessage());
            }
        }

        if (str_starts_with($mimeType, 'image/')) {
            try {
                $base64 = base64_encode(file_get_contents($path));
                $response = Http::withoutVerifying()
                    ->withToken($apiKey)
                    ->acceptJson()
                    ->asJson()
                    ->timeout(30)
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model' => config('payroll.groq_vision_model'),
                        'temperature' => 0.1,
                        'response_format' => ['type' => 'json_object'],
                        'messages' => [
                            [
                                'role' => 'system',
                                'content' => 'You are a payroll details parser. Extract employee and salary breakdown fields from the provided payslip image. Return a JSON object matching this schema exactly: {"employee_name": string|null, "employee_id": string|null, "month": string|null, "basic_salary": number, "hra": number, "allowances": number, "bonus": number, "overtime": number, "pf": number, "esi": number, "tds": number, "other_deductions": number, "gross_salary": number, "net_salary": number, "working_days": number, "paid_days": number}. Ensure all number fields are numeric, not strings.',
                            ],
                            [
                                'role' => 'user',
                                'content' => [
                                    [
                                        'type' => 'text',
                                        'text' => 'Extract all values from this payslip image.',
                                    ],
                                    [
                                        'type' => 'image_url',
                                        'image_url' => [
                                            'url' => 'data:' . $mimeType . ';base64,' . $base64,
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ]);

                if ($response->successful()) {
                    $content = data_get($response->json(), 'choices.0.message.content', '{}');
                    $data = json_decode($content, true);
                    if (is_array($data)) {
                        return [
                            'raw_text' => 'Extracted via Groq Vision API.',
                            'data' => $this->sanitizeExtractedData($data),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Groq Vision Fallback Failed: ' . $e->getMessage());
            }
        }

        return [];
    }

    private function sanitizeExtractedData(array $data): array
    {
        $fields = [
            'employee_name', 'employee_id', 'month', 'basic_salary', 'hra', 
            'allowances', 'bonus', 'overtime', 'pf', 'esi', 'tds', 
            'other_deductions', 'gross_salary', 'net_salary', 'working_days', 'paid_days'
        ];
        
        $sanitized = [];
        foreach ($fields as $field) {
            if (in_array($field, ['employee_name', 'employee_id', 'month'])) {
                $sanitized[$field] = isset($data[$field]) ? (string)$data[$field] : null;
            } else {
                $sanitized[$field] = isset($data[$field]) ? (float)$data[$field] : 0.0;
            }
        }
        return $sanitized;
    }

    private function parsePayrollText(string $text): array
    {
        // 1. Clean OCR noise, symbols, copyright markers, and common formatting artifacts
        $text = preg_replace('/\([a-zA-Z0-9®₹?§\s]\)/u', ' ', $text);
        $text = preg_replace('/[|©]/u', ' ', $text);

        // 2. Extractions using strictly bounded horizontal layout patterns
        $da = $this->money($text, 'DA|Dearness Allowance');
        $transport = $this->money($text, 'Transport Allowance');
        $special = $this->money($text, 'Special Allowance');
        $otherAllowance = $this->money($text, 'Other Allowance');
        $generalAllowance = $this->money($text, 'Allowances');
        $totalAllowances = $da + $transport + $special + $otherAllowance + $generalAllowance;

        $profTax = $this->money($text, 'Professional Tax|Prof Tax');
        $loan = $this->money($text, 'Loan Recovery|Loan');
        $otherDeduct = $this->money($text, 'Other Deduction|Misc Deductions|Other Deductions');
        $totalOtherDeductions = $profTax + $loan + $otherDeduct;

        $month = $this->matchText($text, '/(?:Month|Pay Period)[:\s]+([A-Za-z0-9 -]+)/i');
        if (!$month) {
            $month = $this->matchText($text, '/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i');
        }

        $fields = [
            'employee_name' => $this->matchText($text, '/Employee Name[:\s]+([A-Za-z .]+)/i'),
            'employee_id' => $this->matchText($text, '/Employee (?:ID|Code)[:\s]+([A-Za-z0-9-]+)/i'),
            'month' => $month,
            'basic_salary' => $this->money($text, 'Basic Salary|Basic Pay|Basic'),
            'hra' => $this->money($text, 'HRA|House Rent Allowance'),
            'allowances' => $totalAllowances,
            'bonus' => $this->money($text, 'Bonus'),
            'overtime' => $this->money($text, 'Overtime|OT'),
            'pf' => $this->money($text, 'PF|Provident Fund'),
            'esi' => $this->money($text, 'ESI'),
            'tds' => $this->money($text, 'TDS|Tax Deducted|Income Tax'),
            'other_deductions' => $totalOtherDeductions,
            'gross_salary' => $this->money($text, 'Gross Salary|Gross Pay|Gross Earnings'),
            'net_salary' => $this->money($text, 'Net Salary|Net Pay|Take Home'),
            'working_days' => $this->number($text, 'Working Days'),
            'paid_days' => $this->number($text, 'Paid Days'),
        ];

        return array_map(fn ($value) => is_string($value) ? trim($value) : $value, $fields);
    }

    private function parseCompensationPlanText(string $text): array
    {
        return [
            'ctc' => $this->money($text, 'CTC|Cost to Company|Annual Compensation|Total Compensation'),
            'cash_in_hand' => $this->money($text, 'Cash in Hand|Take Home|Net Pay|Net Salary'),
            'pf' => $this->money($text, 'PF|Provident Fund|Employee PF|EPF'),
            'shares_held' => $this->number($text, 'Shares Held|Share Holding|ESOP|RSU|Stock Units|Shares'),
        ];
    }

    private function sanitizeOfferData(array $data): array
    {
        $numeric = ['ctc', 'cash_in_hand', 'employee_pf', 'employer_pf', 'bonus', 'stock_value', 'insurance_value', 'joining_bonus'];
        $result = ['company_name' => isset($data['company_name']) ? (string) $data['company_name'] : null, 'designation' => isset($data['designation']) ? (string) $data['designation'] : null];
        foreach ($numeric as $field) {
            $result[$field] = max(0, (float) ($data[$field] ?? 0));
        }
        return $result;
    }

    private function parseOfferText(string $text): array
    {
        return $this->sanitizeOfferData([
            'company_name' => $this->matchText($text, '/(?:Company|Organisation|Organization)\s*(?:Name)?[:\s]+([^\n]+)/i'),
            'designation' => $this->matchText($text, '/(?:Designation|Position|Role)[:\s]+([^\n]+)/i'),
            'ctc' => $this->money($text, 'CTC|Cost to Company|Annual Compensation|Total Compensation'),
            'cash_in_hand' => $this->money($text, 'Cash in Hand|Take Home|Net Pay|Net Salary'),
            'employee_pf' => $this->money($text, 'Employee PF|Employee Provident Fund'),
            'employer_pf' => $this->money($text, 'Employer PF|Employer Provident Fund'),
            'bonus' => $this->money($text, 'Annual Bonus|Performance Bonus|Bonus'),
            'stock_value' => $this->money($text, 'ESOP|RSU|Stock Value|Equity Value'),
            'insurance_value' => $this->money($text, 'Insurance|Medical Benefit|Benefits Value'),
            'joining_bonus' => $this->money($text, 'Joining Bonus|Sign.?on Bonus'),
        ]);
    }

    private function money(string $text, string $label): float
    {
        // strictly bounded regex pattern to prevent search leakage into adjacent column text
        $pattern = '/(?:' . $label . ')[:\s\-\.₹$]*\b(?:Rs\.?|INR)?[:\s\-\.₹$]*([0-9,]+(?:\.[0-9]{1,2})?)\b/i';
        $matched = $this->matchText($text, $pattern);
        return (float) str_replace(',', '', $matched ?: 0);
    }

    private function number(string $text, string $label): float
    {
        $pattern = '/(?:' . $label . ')[:\s\-\.₹$]*\b([0-9.]+)\b/i';
        return (float) ($this->matchText($text, $pattern) ?: 0);
    }

    private function matchText(string $text, string $pattern): ?string
    {
        return preg_match($pattern, $text, $matches) ? $matches[1] : null;
    }

    private function mockText(): string
    {
        return "Employee Name: Priya Sharma\nEmployee ID: EMP-1001\nMonth: 2026-05\nBasic Salary: 50000\nHRA: 20000\nAllowances: 12000\nBonus: 5000\nOvertime: 3000\nPF: 6000\nESI: 0\nTDS: 7000\nOther Deductions: 1000\nGross Salary: 90000\nNet Salary: 76000\nWorking Days: 22\nPaid Days: 22";
    }
}
