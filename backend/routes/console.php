<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('about:payroll-auditor', function () {
    $this->info('AI Payroll Auditor API is ready.');
});

