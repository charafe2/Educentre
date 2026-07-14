<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SuperAdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->where('email', $credentials['email'])
            ->where('role', 'superadmin')
            ->where('status', 'active')
            ->first();

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            return $this->error('Identifiants super-admin incorrects.', code: 401);
        }

        $token = $user->createToken('superadmin-token', ['superadmin'], now()->addDays(7))->plainTextToken;
        $user->update(['last_login_at' => now()]);

        return $this->success([
            'token' => $token,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 'Connexion super-admin réussie.');
    }

    public function me(Request $request): JsonResponse
    {
        if ($request->user()?->role !== 'superadmin') {
            return $this->error('Accès super-admin requis.', code: 403);
        }

        return $this->success([
            'name' => $request->user()->name,
            'email' => $request->user()->email,
            'role' => $request->user()->role,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($request->user()?->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

        return $this->success(message: 'Déconnexion super-admin réussie.');
    }
}
