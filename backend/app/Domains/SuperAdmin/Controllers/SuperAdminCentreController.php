<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\Centre;
use App\Domains\SuperAdmin\Requests\StoreSuperAdminCentreRequest;
use App\Domains\SuperAdmin\Requests\UpdateSuperAdminCentreRequest;
use App\Domains\SuperAdmin\Resources\SuperAdminCentreResource;
use App\Domains\SuperAdmin\Services\SuperAdminCentreService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminCentreController extends Controller
{
    public function __construct(private readonly SuperAdminCentreService $centreService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return $this->success(SuperAdminCentreResource::collection(
            $this->centreService->all($request->only(['search', 'status']))
        ));
    }

    public function store(StoreSuperAdminCentreRequest $request): JsonResponse
    {
        return $this->success(
            new SuperAdminCentreResource($this->centreService->create($request->validated())),
            'Centre créé avec succès.',
            201
        );
    }

    public function update(Centre $centre, UpdateSuperAdminCentreRequest $request): JsonResponse
    {
        return $this->success(
            new SuperAdminCentreResource($this->centreService->update($centre, $request->validated())),
            'Centre mis à jour avec succès.'
        );
    }

    public function toggleStatus(Centre $centre, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return $this->success(
            new SuperAdminCentreResource($this->centreService->toggleStatus($centre)),
            'Statut du centre mis à jour.'
        );
    }

    public function destroy(Centre $centre, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        $this->centreService->delete($centre);

        return $this->success(null, 'Centre supprimé avec succès.');
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'superadmin', 403, 'Accès super-admin requis.');
    }
}
