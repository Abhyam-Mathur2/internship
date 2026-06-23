<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
