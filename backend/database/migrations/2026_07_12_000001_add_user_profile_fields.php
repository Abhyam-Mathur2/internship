<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_name')->nullable();
            $table->decimal('ctc', 15, 2)->nullable();
            $table->decimal('cash_in_hand', 15, 2)->nullable();
            $table->string('designation')->nullable();
            $table->string('first_post')->nullable();
            $table->string('current_post')->nullable();
            $table->integer('overall_experience')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'company_name',
                'ctc',
                'cash_in_hand',
                'designation',
                'first_post',
                'current_post',
                'overall_experience',
            ]);
        });
    }
};
