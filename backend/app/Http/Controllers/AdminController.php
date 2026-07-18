<?php

namespace App\Http\Controllers;

use App\Models\Payslip;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function users(): JsonResponse
    {
        return response()->json(User::query()->with('employee')->latest()->paginate(20));
    }

    public function payslips(): JsonResponse
    {
        return response()->json(Payslip::query()->with('employee.user', 'report')->latest()->paginate(20));
    }

    public function settings(): JsonResponse
    {
        return response()->json(['settings' => SystemSetting::query()->pluck('value', 'key')]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings' => ['required', 'array'],
        ]);

        foreach ($data['settings'] as $key => $value) {
            SystemSetting::query()->updateOrCreate(['key' => strip_tags($key)], ['value' => $value]);
        }

        return $this->settings();
    }
}

