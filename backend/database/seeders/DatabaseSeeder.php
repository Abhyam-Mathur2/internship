<?php

namespace Database\Seeders;

use App\Models\AuditReport;
use App\Models\Employee;
use App\Models\Payslip;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@payrollaudit.test'],
            ['name' => 'Admin User', 'password' => Hash::make('password'), 'role' => 'admin']
        );

        $user = User::query()->firstOrCreate(
            ['email' => 'employee@payrollaudit.test'],
            ['name' => 'Priya Sharma', 'password' => Hash::make('password'), 'role' => 'employee']
        );

        $employee = Employee::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['employee_name' => 'Priya Sharma', 'employee_code' => 'EMP-1001']
        );

        $payslip = Payslip::query()->firstOrCreate(
            ['employee_id' => $employee->id, 'month' => '2026-05'],
            [
                'file_path' => 'seed/demo-payslip.pdf',
                'original_filename' => 'demo-payslip.pdf',
                'mime_type' => 'application/pdf',
                'file_size' => 1024,
                'gross_salary' => 90000,
                'net_salary' => 76000,
                'status' => 'analyzed',
                'extracted_data' => [
                    'employee_name' => 'Priya Sharma',
                    'employee_id' => 'EMP-1001',
                    'month' => '2026-05',
                    'basic_salary' => 50000,
                    'hra' => 20000,
                    'allowances' => 12000,
                    'bonus' => 5000,
                    'overtime' => 3000,
                    'pf' => 6000,
                    'esi' => 0,
                    'tds' => 7000,
                    'other_deductions' => 1000,
                    'gross_salary' => 90000,
                    'net_salary' => 76000,
                    'working_days' => 22,
                    'paid_days' => 22,
                ],
            ]
        );

        AuditReport::query()->firstOrCreate(
            ['payslip_id' => $payslip->id],
            [
                'audit_score' => 92,
                'risk_level' => 'low',
                'verification' => ['warnings' => ['PF is aligned with expected statutory contribution.']],
                'issues' => [],
                'recommendations' => ['Keep salary component labels consistent across months.'],
                'ai_analysis' => [
                    'summary' => 'Payroll appears healthy with no material mismatch.',
                    'deduction_explanation' => 'Major deductions are PF and TDS.',
                ],
            ]
        );

        SystemSetting::query()->updateOrCreate(['key' => 'risk_thresholds'], [
            'value' => ['low' => 80, 'medium' => 60, 'high' => 0],
        ]);
    }
}

