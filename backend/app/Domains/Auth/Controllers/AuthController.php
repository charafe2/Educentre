<?php

namespace App\Domains\Auth\Controllers;

use App\Domains\Auth\DTOs\LoginDTO;
use App\Domains\Auth\Events\UserLoggedOut;
use App\Domains\Auth\Requests\ChangePasswordRequest;
use App\Domains\Auth\Requests\LoginRequest;
use App\Domains\Auth\Requests\SelectCentreRequest;
use App\Domains\Auth\Resources\UserResource;
use App\Domains\Auth\Services\AuthService;
use App\Domains\Core\Models\Centre;
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
        $request->ensureIsNotRateLimited();

        try {
            $result = $this->authService->login(
                LoginDTO::fromArray($request->validated()),
                $request->throttleKey()
            );

            if ($result['status'] === 'centre_selection_required') {
                return $this->success(
                    data: [
                        'requiresCentreSelection' => true,
                        'preAuthToken' => $result['preAuthToken'],
                        'accountName' => $result['accountName'],
                        'centres' => $result['centres']->map(fn (Centre $c) => [
                            'tenantUuid' => $c->tenant->uuid,
                            'centreUuid' => $c->uuid,
                            'centreName' => $c->name,
                            'centreType' => $c->type,
                            'city' => $c->city,
                            'isActive' => $c->is_active,
                        ]),
                    ],
                    message: 'Sélectionnez un centre pour continuer.',
                );
            }

            return $this->success(
                data: [
                    'user' => UserResource::make($result['user']),
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

    /**
     * Step 2 of a multitenant login. The `centre-select` ability check
     * (rather than the `staff` middleware group) is what stops this
     * short-lived token from being used as a general session — see
     * EnsureStaffUser for the corresponding lock-down on every other route.
     */
    public function selectCentre(SelectCentreRequest $request): JsonResponse
    {
        if (! $request->user()?->tokenCan('centre-select')) {
            return $this->error('Jeton invalide pour cette opération.', null, 403);
        }

        try {
            $result = $this->authService->selectCentre(
                $request->user(),
                $request->validated('centreUuid'),
            );

            return $this->success(
                data: [
                    'user' => UserResource::make($result['user']),
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
        $user = $request->user();
        $user->currentAccessToken()->delete();

        UserLoggedOut::dispatch($user);

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
            data: UserResource::make($request->user()),
        );
    }
}
