<?php

namespace App\Domains\Auth\Controllers;

use App\Domains\Auth\Requests\ChangePasswordRequest;
use App\Domains\Auth\Requests\LoginRequest;
use App\Domains\Auth\Resources\UserResource;
use App\Domains\Auth\Services\AuthService;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Authentication', description: 'Connexion, déconnexion et gestion du mot de passe')]
class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuthService $authService
    ) {}

    #[OA\Post(
        path: '/auth/login',
        summary: 'Connecter un utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'admin@moujtahid.ma'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'admin123456789'),
            ])
        ),
        tags: ['Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Connexion réussie',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', properties: [
                        new OA\Property(property: 'user', ref: '#/components/schemas/User'),
                        new OA\Property(property: 'token', type: 'string', example: '1|abc123...'),
                    ], type: 'object'),
                    new OA\Property(property: 'message', type: 'string', example: 'Connexion réussie.'),
                ])
            ),
            new OA\Response(
                response: 401,
                description: 'Identifiants incorrects',
            ),
            new OA\Response(
                response: 422,
                description: 'Erreur de validation',
            ),
        ]
    )]
    public function login(LoginRequest $request): JsonResponse
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
                'user' => UserResource::make($result['user']),
                'token' => $result['token'],
            ],
            message: 'Connexion réussie.',
        );
    }

    #[OA\Post(
        path: '/auth/verify-password',
        summary: 'Vérifier le mot de passe actuel',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'email', type: 'string', format: 'email', example: 'admin@moujtahid.ma'),
                new OA\Property(property: 'password', type: 'string', format: 'password', example: 'admin123456789'),
            ])
        ),
        tags: ['Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Résultat de la vérification',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean'),
                    new OA\Property(property: 'data', properties: [
                        new OA\Property(property: 'valid', type: 'boolean'),
                    ], type: 'object'),
                ])
            ),
        ]
    )]
    public function verifyPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $result = $this->authService->verifyPassword(
            $request->input('email'),
            $request->input('password'),
        );

        return $this->success(
            data: ['valid' => $result],
        );
    }

    #[OA\Put(
        path: '/auth/password/change',
        summary: 'Changer le mot de passe',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(properties: [
                new OA\Property(property: 'current_password', type: 'string', format: 'password', example: 'admin123456789'),
                new OA\Property(property: 'new_password', type: 'string', format: 'password', example: 'NewStrongPass123'),
                new OA\Property(property: 'new_password_confirmation', type: 'string', format: 'password', example: 'NewStrongPass123'),
            ])
        ),
        tags: ['Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Mot de passe modifié',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'message', type: 'string', example: 'Mot de passe modifié avec succès.'),
                ])
            ),
            new OA\Response(
                response: 422,
                description: 'Erreur de validation',
            ),
            new OA\Response(
                response: 401,
                description: 'Non authentifié',
            ),
        ]
    )]
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->authService->changePassword(
            $request->user(),
            $request->validated('new_password'),
        );

        return $this->success(
            message: 'Mot de passe modifié avec succès.',
        );
    }

    #[OA\Post(
        path: '/auth/logout',
        summary: 'Déconnecter l\'utilisateur',
        security: [['sanctum' => []]],
        tags: ['Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Déconnexion réussie',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'message', type: 'string', example: 'Déconnexion réussie.'),
                ])
            ),
            new OA\Response(
                response: 401,
                description: 'Non authentifié',
            ),
        ]
    )]
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->success(
            message: 'Déconnexion réussie.'
        );
    }

    #[OA\Get(
        path: '/auth/me',
        summary: 'Récupérer l\'utilisateur connecté',
        security: [['sanctum' => []]],
        tags: ['Authentication'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Utilisateur connecté',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/User'),
                ])
            ),
            new OA\Response(
                response: 401,
                description: 'Non authentifié',
            ),
        ]
    )]
    public function me(Request $request): JsonResponse
    {
        return $this->success(
            data: UserResource::make($request->user()->load('tenant')),
        );
    }
}
