<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    protected $fillable = [
        'employee_id',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'month',
        'gross_salary',
        'net_salary',
        'extracted_data',
        'ocr_text',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'gross_salary' => 'decimal:2',
            'net_salary' => 'decimal:2',
            'extracted_data' => 'array',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function report()
    {
        return $this->hasOne(AuditReport::class);
    }
}

