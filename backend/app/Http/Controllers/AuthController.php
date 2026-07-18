<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\User;
use App\Services\JwtService;
use App\Services\OcrService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request, JwtService $jwt): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            'employee_code' => ['nullable', 'string', 'max:80'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'designation_first_post' => ['nullable', 'string', 'max:120'],
            'designation_current_post' => ['nullable', 'string', 'max:120'],
            'overall_experience' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'ctc' => ['nullable', 'numeric', 'min:0'],
            'cash_in_hand' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = User::query()->create([
            'name' => strip_tags($data['name']),
            'email' => strtolower($data['email']),
            'password' => Hash::make($data['password']),
            'role' => 'employee',
        ]);

        Employee::query()->create([
            'user_id' => $user->id,
            'employee_name' => $user->name,
            'employee_code' => $data['employee_code'] ?? null,
            'company_name' => $data['company_name'] ?? null,
            'designation_first_post' => $data['designation_first_post'] ?? null,
            'designation_current_post' => $data['designation_current_post'] ?? null,
            'overall_experience' => $data['overall_experience'] ?? null,
            'ctc' => $data['ctc'] ?? null,
            'cash_in_hand' => $data['cash_in_hand'] ?? null,
        ]);

        return $this->respondWithToken($jwt, $user);
    }

    public function login(Request $request, JwtService $jwt): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', strtolower($credentials['email']))->first();
        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
                'details' => [],
            ], 401);
        }

        return $this->respondWithToken($jwt, $user);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->load('employee')]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'employee_code' => ['nullable', 'string', 'max:80'],
            'company_name' => ['nullable', 'string', 'max:160'],
            'designation_first_post' => ['nullable', 'string', 'max:120'],
            'designation_current_post' => ['nullable', 'string', 'max:120'],
            'overall_experience' => ['nullable', 'numeric', 'min:0', 'max:80'],
            'ctc' => ['nullable', 'numeric', 'min:0'],
            'cash_in_hand' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $user->update(['name' => strip_tags($data['name'])]);

        $employee = Employee::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['employee_name' => $user->name]
        );

        $employee->update([
            'employee_name' => strip_tags($data['name']),
            'employee_code' => $data['employee_code'] ?? null,
            'company_name' => $data['company_name'] ?? null,
            'designation_first_post' => $data['designation_first_post'] ?? null,
            'designation_current_post' => $data['designation_current_post'] ?? null,
            'overall_experience' => $data['overall_experience'] ?? null,
            'ctc' => $data['ctc'] ?? null,
            'cash_in_hand' => $data['cash_in_hand'] ?? null,
        ]);

        return response()->json(['user' => $user->fresh()->load('employee')]);
    }

    public function uploadCompensationPlan(Request $request, OcrService $ocr): JsonResponse
    {
        $maxKb = config('payroll.max_upload_kb');
        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.$maxKb, 'mimes:pdf,jpg,jpeg,png'],
            'ctc' => ['nullable', 'numeric', 'min:0'],
            'cash_in_hand' => ['nullable', 'numeric', 'min:0'],
            'pf' => ['nullable', 'numeric', 'min:0'],
            'shares_held' => ['nullable', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $employee = Employee::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['employee_name' => $user->name]
        );

        $file = $data['file'];
        $path = $file->store('compensation-plans/'.$employee->id);
        $extraction = $ocr->extractCompensationPlan(Storage::path($path), $file->getMimeType() ?: 'application/octet-stream');
        $planData = array_filter([
            'ctc' => $data['ctc'] ?? $extraction['data']['ctc'] ?? null,
            'cash_in_hand' => $data['cash_in_hand'] ?? $extraction['data']['cash_in_hand'] ?? null,
            'pf' => $data['pf'] ?? $extraction['data']['pf'] ?? null,
            'shares_held' => $data['shares_held'] ?? $extraction['data']['shares_held'] ?? null,
            'raw_text' => $extraction['raw_text'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');

        $employee->update([
            'ctc' => $planData['ctc'] ?? $employee->ctc,
            'cash_in_hand' => $planData['cash_in_hand'] ?? $employee->cash_in_hand,
            'compensation_plan_path' => $path,
            'compensation_plan_filename' => $file->getClientOriginalName(),
            'compensation_plan_data' => $planData,
        ]);

        return response()->json(['employee' => $employee->fresh(), 'compensation_plan' => $planData]);
    }

    public function extractOffer(Request $request, OcrService $ocr): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.config('payroll.max_upload_kb'), 'mimes:jpg,jpeg,png'],
        ]);
        $file = $data['file'];
        $path = $file->store('temporary-offers/'.($request->user()->id));
        try {
            $extraction = $ocr->extractOffer(Storage::path($path), $file->getMimeType() ?: 'application/octet-stream');
            return response()->json(['extraction' => $extraction]);
        } finally {
            Storage::delete($path);
        }
    }

    public function logout(): JsonResponse
    {
        return response()->json(['message' => 'Logged out.']);
    }

    private function respondWithToken(JwtService $jwt, User $user): JsonResponse
    {
        $ttl = (int) env('JWT_TTL', 1440) * 60;

        return response()->json([
            'success' => true,
            'access_token' => $jwt->issue($user),
            'token_type' => 'bearer',
            'expires_in' => $ttl,
            'user' => $user->load('employee'),
        ]);
    }
}
