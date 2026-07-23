<?php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\DTOs\LoginDTO;
use App\Domains\Auth\Events\UserLoggedIn;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthService
{
    public function changePassword(User $user, string $newPassword): void
    {
        $user->update([
            'password' => Hash::make($newPassword),
        ]);
    }

    public function verifyPassword(string $email, string $password): bool
    {
        $user = User::where('email', $email)->first();

        return $user !== null && Hash::check($password, $user->password);
    }

    public function login(LoginDTO $dto, string $throttleKey): array
    {
        $user = User::where('email', $dto->email)->first();

        if ($user === null || !Hash::check($dto->password, $user->password)) {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Email ou mot de passe incorrect.');
        }

        if ($user->status !== 'active') {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Ce compte n\'est pas actif.');
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth-token', ['*'], now()->addDays(7))->plainTextToken;

        $user->update(['last_login_at' => now()]);

        UserLoggedIn::dispatch($user);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
