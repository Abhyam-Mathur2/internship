<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payslip_comparisons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('current_payslip_id')->constrained('payslips')->onDelete('cascade');
            $table->foreignId('previous_payslip_id')->constrained('payslips')->onDelete('cascade');
            $table->json('comparison_findings');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payslip_comparisons');
    }
};
