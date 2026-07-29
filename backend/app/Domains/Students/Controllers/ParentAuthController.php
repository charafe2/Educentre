<?php

namespace App\Domains\Students\Controllers;

use App\Domains\Students\DTOs\ParentLoginDTO;
use App\Domains\Students\Requests\ParentLoginRequest;
use App\Domains\Students\Resources\ParentResource;
use App\Domains\Students\Resources\StudentResource;
use App\Domains\Students\Services\ParentAuthService;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParentAuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ParentAuthService $authService
    ) {}

    public function login(ParentLoginRequest $request): JsonResponse
    {
        $request->ensureIsNotRateLimited();

        try {
            $result = $this->authService->login(
                ParentLoginDTO::fromArray($request->validated()),
                $request->throttleKey()
            );

            return $this->success(
                data: [
                    'parent' => ParentResource::make($result['parent']),
                    'children' => StudentResource::collection($result['children']),
                    'token' => $result['token'],
                ],
                message: 'Connexion réussie.',
            );
        } catch (AuthenticationException $e) {
            return $this->error(message: $e->getMessage(), code: 401);
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(message: 'Déconnexion réussie.');
    }

    public function me(Request $request): JsonResponse
    {
        $parent = $request->user();

        return $this->success(data: [
            'parent' => ParentResource::make($parent),
            'children' => StudentResource::collection($this->authService->childrenFor($parent)),
        ]);
    }
}
