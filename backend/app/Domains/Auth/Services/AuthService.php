<?php

namespace App\Domains\Auth\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

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

    public function login(string $email, string $password): ?array
    {
        $user = User::where('email', $email)->first();

        if ($user === null || !Hash::check($password, $user->password)) {
            return null;
        }

        if ($user->status !== 'active') {
            return null;
        }

        $token = $user->createToken('auth-token', ['*'], now()->addDays(7))->plainTextToken;

        $user->update(['last_login_at' => now()]);

        return [
            'user' => $user,
            'token' => $token,
        ];
    }
}
