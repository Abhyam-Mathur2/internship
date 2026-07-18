<?php

namespace App\Services;

use App\Models\User;

class JwtService
{
    public function issue(User $user): string
    {
        $now = time();
        $ttl = (int) env('JWT_TTL', 1440) * 60;

        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $payload = [
            'iss' => config('app.url'),
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttl,
            'sub' => $user->id,
            'role' => $user->role,
        ];

        $segments = [
            $this->base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR)),
            $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR)),
        ];
        $signature = hash_hmac('sha256', implode('.', $segments), $this->secret(), true);
        $segments[] = $this->base64UrlEncode($signature);

        return implode('.', $segments);
    }

    public function decode(string $token): object
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Malformed token.');
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
        $header = json_decode($this->base64UrlDecode($encodedHeader), true, flags: JSON_THROW_ON_ERROR);
        if (($header['alg'] ?? null) !== 'HS256') {
            throw new \RuntimeException('Unsupported token algorithm.');
        }

        $expected = $this->base64UrlEncode(hash_hmac('sha256', $encodedHeader.'.'.$encodedPayload, $this->secret(), true));
        if (!hash_equals($expected, $encodedSignature)) {
            throw new \RuntimeException('Invalid token signature.');
        }

        $payload = json_decode($this->base64UrlDecode($encodedPayload), false, flags: JSON_THROW_ON_ERROR);
        $now = time();
        if (($payload->nbf ?? 0) > $now || ($payload->exp ?? 0) < $now) {
            throw new \RuntimeException('Token is not active.');
        }

        return $payload;
    }

    private function secret(): string
    {
        $secret = env('JWT_SECRET') ?: config('app.key');
        if (!$secret) {
            throw new \RuntimeException('JWT_SECRET or APP_KEY must be configured.');
        }

        return $secret;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);
        if ($decoded === false) {
            throw new \RuntimeException('Invalid base64url value.');
        }

        return $decoded;
    }
}
