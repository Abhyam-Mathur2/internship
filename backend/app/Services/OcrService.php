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

        $rawText = match (config('payroll.ocr_driver')) {
            'tesseract' => $this->extractWithTesseract($path),
            'ocrspace' => $this->extractWithOcrSpace($path),
            default => $this->mockText(),
        };

        if ($mimeType === 'application/pdf' && config('payroll.ocr_driver') !== 'ocrspace') {
            $pdfText = $this->extractPdfText($path);
            $rawText = trim($pdfText) !== '' ? $pdfText : $rawText;
        }

        return [
            'raw_text' => $rawText,
            'data' => $this->parsePayrollText($rawText),
        ];
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
            $binary = escapeshellcmd(config('payroll.tesseract_binary'));
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

    private function parsePayrollText(string $text): array
    {
        // Clean OCR noise/symbols (like parenthetical rupee signs scanned as (2) or (®), pipes, etc.)
        $text = preg_replace('/\([a-zA-Z0-9®₹?§\s]\)/u', ' ', $text);
        $text = preg_replace('/[|©]/', ' ', $text);

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

    private function money(string $text, string $label): float
    {
        return (float) str_replace(',', '', $this->matchText($text, '/(?:'.$label.')[^\r\n]*?([0-9,]+(?:\.[0-9]{1,2})?)/i') ?: 0);
    }

    private function number(string $text, string $label): float
    {
        return (float) ($this->matchText($text, '/(?:'.$label.')[^\r\n]*?([0-9.]+)/i') ?: 0);
    }

    private function matchText(string $text, string $pattern): ?string
    {
        return preg_match($pattern, $text, $matches) ? $matches[1] : null;
    }

    private function mockText(): string
    {
        return <<<TEXT
Employee Name: Priya Sharma
Employee ID: EMP-1001
Month: 2026-05
Basic Salary: 50000
HRA: 20000
Allowances: 12000
Bonus: 5000
Overtime: 3000
PF: 6000
ESI: 0
TDS: 7000
Other Deductions: 1000
Gross Salary: 90000
Net Salary: 76000
Working Days: 22
Paid Days: 22
TEXT;
    }
}
