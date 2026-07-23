<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\SuperAdmin\DTOs\SuperAdminLoginDTO;
use App\Domains\SuperAdmin\Events\SuperAdminLoggedIn;
use App\Models\SuperAdmin;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class SuperAdminAuthService
{
    public function login(SuperAdminLoginDTO $dto, string $throttleKey): array
    {
        $superAdmin = SuperAdmin::where('email', $dto->email)->first();

        if ($superAdmin === null || !Hash::check($dto->password, $superAdmin->password)) {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Email ou mot de passe incorrect.');
        }

        RateLimiter::clear($throttleKey);

        $token = $superAdmin->createToken('superadmin-auth-token', ['*'], now()->addDays(7))->plainTextToken;

        SuperAdminLoggedIn::dispatch($superAdmin);

        return [
            'user' => $superAdmin,
            'token' => $token,
        ];
    }
}
