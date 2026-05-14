<?php

namespace App\Domains\Settings\Controllers;

use App\Domains\Settings\Requests\UpdateSettingsRequest;
use App\Domains\Settings\Resources\SettingsResource;
use App\Domains\Settings\Services\SettingsService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'Settings', description: 'Paramètres du centre')]
#[OA\Schema(
    schema: 'CentreSettings',
    properties: [
        new OA\Property(property: 'name', type: 'string', example: 'Centre Éducatif Al Moujtahid'),
        new OA\Property(property: 'type', type: 'string', example: 'Soutien scolaire'),
        new OA\Property(property: 'city', type: 'string', example: 'Casablanca'),
        new OA\Property(property: 'address', type: 'string', example: '12 Rue Al Qods, Hay Mohammadi'),
        new OA\Property(property: 'phone', type: 'string', example: '+212 522 123 456'),
        new OA\Property(property: 'whatsapp', type: 'string', example: '+212 661 234 567'),
    ],
    type: 'object'
)]
class SettingsController extends Controller
{
    public function __construct(
        private readonly SettingsService $settingsService
    ) {}

    #[OA\Get(
        path: '/settings/centre',
        summary: 'Récupérer les informations du centre',
        security: [['sanctum' => []]],
        tags: ['Settings'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Informations du centre',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/CentreSettings'),
                ])
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function centre(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        return $this->success(
            data: SettingsResource::make($tenant),
        );
    }

    #[OA\Put(
        path: '/settings/centre',
        summary: 'Mettre à jour les informations du centre',
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/CentreSettings')
        ),
        tags: ['Settings'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Informations mises à jour',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'success', type: 'boolean', example: true),
                    new OA\Property(property: 'data', ref: '#/components/schemas/CentreSettings'),
                    new OA\Property(property: 'message', type: 'string', example: 'Informations du centre mises à jour.'),
                ])
            ),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 422, description: 'Erreur de validation'),
        ]
    )]
    public function updateCentre(UpdateSettingsRequest $request): JsonResponse
    {
        $tenant = $request->user()->tenant;

        $this->settingsService->updateCentre($tenant, $request->validated());

        return $this->success(
            data: SettingsResource::make($tenant->fresh()),
            message: 'Informations du centre mises à jour.',
        );
    }
}
