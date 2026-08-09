<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\DTOs\SuperAdminLoginDTO;
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
        $request->ensureIsNotRateLimited();

        try {
            $result = $this->authService->login(
                SuperAdminLoginDTO::fromArray($request->validated()),
                $request->throttleKey()
            );

            return $this->success(
                data: [
                    'user' => SuperAdminResource::make($result['user']),
                    'token' => $result['token'],
                ],
                message: 'Connexion réussie.',
            );
        } catch (\Illuminate\Auth\AuthenticationException $e) {
            return $this->error(
                message: $e->getMessage(),
                code: 401,
            );
        }
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

    /**
     * Assignable operators, used by the tickets page. Suspended accounts are
     * excluded — a ticket must not be handed to someone who can't sign in.
     */
    public function index(): JsonResponse
    {
        $superadmins = \App\Models\SuperAdmin::active()->orderBy('name')->get();

        return $this->success(data: SuperAdminResource::collection($superadmins));
    }
}
