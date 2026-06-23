<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditReport extends Model
{
    protected $fillable = [
        'payslip_id',
        'audit_score',
        'risk_level',
        'verification',
        'issues',
        'recommendations',
        'ai_analysis',
    ];

    protected function casts(): array
    {
        return [
            'verification' => 'array',
            'issues' => 'array',
            'recommendations' => 'array',
            'ai_analysis' => 'array',
        ];
    }

    public function payslip()
    {
        return $this->belongsTo(Payslip::class);
    }
}

