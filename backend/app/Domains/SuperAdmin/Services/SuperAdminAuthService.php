<?php

namespace App\Domains\SuperAdmin\Services;

use App\Models\SuperAdmin;
use Illuminate\Support\Facades\Hash;

class SuperAdminAuthService
{
    public function login(string $email, string $password): ?array
    {
        $superAdmin = SuperAdmin::where('email', $email)->first();

        if ($superAdmin === null || !Hash::check($password, $superAdmin->password)) {
            return null;
        }

        $token = $superAdmin->createToken('superadmin-auth-token', ['*'], now()->addDays(7))->plainTextToken;

        return [
            'user' => $superAdmin,
            'token' => $token,
        ];
    }
}
