<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Requests\SuperAdminLoginRequest;
use App\Domains\SuperAdmin\Resources\SuperAdminResource;
use App\Domains\SuperAdmin\Services\SuperAdminAuthService;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminAuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly SuperAdminAuthService $authService
    ) {}

    public function login(SuperAdminLoginRequest $request): JsonResponse
    {
        $result = $this->authService->login(
            $request->validated('email'),
            $request->validated('password'),
        );

        if ($result === null) {
            return $this->error(
                message: 'Email ou mot de passe incorrect.',
                code: 401,
            );
        }

        return $this->success(
            data: [
                'user' => SuperAdminResource::make($result['user']),
                'token' => $result['token'],
            ],
            message: 'Connexion réussie.',
        );
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(message: 'Déconnexion réussie.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success(data: SuperAdminResource::make($request->user()));
    }
}
