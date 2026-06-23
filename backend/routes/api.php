<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\PayslipController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
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
