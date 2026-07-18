<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

foreach (App\Models\AuditReport::with('payslip.employee')->get() as $report) {
    echo "Report ID: " . $report->id . "\n";
    echo "Payslip ID: " . $report->payslip_id . "\n";
    echo "Score: " . $report->audit_score . "\n";
    echo "File: " . $report->payslip?->original_filename . "\n";
    echo "Status: " . $report->payslip?->status . "\n";
    echo "Extracted: " . json_encode($report->payslip?->extracted_data) . "\n";
    echo "----------------------------------------\n";
}
