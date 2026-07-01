<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\PayslipController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/debug-info', function () {
    try {
        \Illuminate\Support\Facades\DB::connection()->getPdo();
        $dbStatus = 'Connected successfully';
        $tables = \Illuminate\Support\Facades\DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        $tablesList = array_map(fn($t) => $t->table_name, $tables);
    } catch (\Exception $e) {
        $dbStatus = 'Database Error: ' . $e->getMessage();
        $tablesList = [];
    }

    $logFile = storage_path('logs/laravel.log');
    $logContent = 'No log file found.';
    if (file_exists($logFile)) {
        $logContent = file_get_contents($logFile);
        $lines = explode("\n", $logContent);
        $lastLines = array_slice($lines, -100);
        $logContent = implode("\n", $lastLines);
    }

    return response()->json([
        'db_status' => $dbStatus,
        'tables' => $tablesList,
        'app_key_exists' => !empty(config('app.key')),
        'jwt_secret_exists' => !empty(env('JWT_SECRET')),
        'last_logs' => $logContent
    ]);
});
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('jwt.auth')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/upload-payslip', [PayslipController::class, 'upload']);
    Route::post('/extract', [PayslipController::class, 'extract']);
    Route::post('/analyze', [PayslipController::class, 'analyze']);
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/report/{report}', [ReportController::class, 'show']);
    Route::delete('/report/{report}', [ReportController::class, 'destroy']);

    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/payslips', [AdminController::class, 'payslips']);
        Route::get('/settings', [AdminController::class, 'settings']);
        Route::put('/settings', [AdminController::class, 'updateSettings']);
    });
});
