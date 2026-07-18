<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('employee_code');
            $table->string('designation_first_post')->nullable()->after('company_name');
            $table->string('designation_current_post')->nullable()->after('designation_first_post');
            $table->decimal('overall_experience', 5, 2)->nullable()->after('designation_current_post');
            $table->decimal('ctc', 12, 2)->nullable()->after('overall_experience');
            $table->decimal('cash_in_hand', 12, 2)->nullable()->after('ctc');
            $table->string('compensation_plan_path')->nullable()->after('cash_in_hand');
            $table->string('compensation_plan_filename')->nullable()->after('compensation_plan_path');
            $table->json('compensation_plan_data')->nullable()->after('compensation_plan_filename');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'designation_first_post',
                'designation_current_post',
                'overall_experience',
                'ctc',
                'cash_in_hand',
                'compensation_plan_path',
                'compensation_plan_filename',
                'compensation_plan_data',
            ]);
        });
    }
};
