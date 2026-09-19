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
    public function __construct(private readonly SuperAdminAccountService $accounts) {}

    public function login(SuperAdminLoginDTO $dto, string $throttleKey): array
    {
        $superAdmin = SuperAdmin::where('email', $dto->email)->first();

        if ($superAdmin === null || !Hash::check($dto->password, $superAdmin->password)) {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Email ou mot de passe incorrect.');
        }

        // Checked after the password so a suspended account is indistinguishable
        // from a wrong password to anyone who doesn't already know the credentials.
        if (! $superAdmin->is_active) {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Ce compte est suspendu.');
        }

        RateLimiter::clear($throttleKey);

        $token = $superAdmin->createToken('superadmin-auth-token', ['*'], now()->addDays(7))->plainTextToken;

        $this->accounts->recordLogin($superAdmin);

        SuperAdminLoggedIn::dispatch($superAdmin);

        return [
            'user' => $superAdmin,
            'token' => $token,
        ];
    }
}
