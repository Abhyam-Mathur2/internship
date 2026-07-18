<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = [
        'user_id',
        'employee_name',
        'employee_code',
        'company_name',
        'designation_first_post',
        'designation_current_post',
        'overall_experience',
        'ctc',
        'cash_in_hand',
        'compensation_plan_path',
        'compensation_plan_filename',
        'compensation_plan_data',
    ];

    protected function casts(): array
    {
        return [
            'ctc' => 'decimal:2',
            'cash_in_hand' => 'decimal:2',
            'overall_experience' => 'decimal:2',
            'compensation_plan_data' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function payslips()
    {
        return $this->hasMany(Payslip::class);
    }
}
