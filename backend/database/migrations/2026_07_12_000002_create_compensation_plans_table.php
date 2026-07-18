<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compensation_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('ctc', 15, 2);
            $table->decimal('cash_in_hand', 15, 2)->nullable();
            $table->decimal('share_holdings', 15, 2)->nullable();
            $table->decimal('pf_contribution', 15, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compensation_plans');
    }
};
