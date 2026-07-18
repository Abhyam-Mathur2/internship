<?php

require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    echo "Running migrations...<br>";
    $status = \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
    echo "Status: " . $status . "<br>";
    echo "Migrations output:<br>";
    echo nl2br(\Illuminate\Support\Facades\Artisan::output());
} catch (\Exception $e) {
    echo "Error running migrations: " . $e->getMessage();
}
