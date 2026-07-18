<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $database = 'connected';
            $status = 'ok';
        } catch (\Throwable) {
            $database = 'disconnected';
            $status = 'error';
        }

        return response()->json([
            'status' => $status,
            'database' => $database,
            'groq' => config('payroll.groq_api_key') ? 'configured' : 'not_configured',
        ], $status === 'ok' ? 200 : 503);
    }
}
