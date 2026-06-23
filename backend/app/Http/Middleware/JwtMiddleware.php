<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class JwtMiddleware
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');
        if (!str_starts_with($header, 'Bearer ')) {
            return response()->json([
                'success' => false,
                'message' => 'Missing bearer token.',
                'details' => [],
            ], 401);
        }

        try {
            $claims = $this->jwt->decode(substr($header, 7));
            $user = User::query()->findOrFail((int) $claims->sub);
            Auth::setUser($user);
        } catch (\Throwable) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired token.',
                'details' => [],
            ], 401);
        }

        return $next($request);
    }
}
