<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Models\PackagePlan;
use App\Domains\SuperAdmin\Requests\SavePackagePlanRequest;
use App\Domains\SuperAdmin\Resources\PackagePlanResource;
use App\Domains\SuperAdmin\Services\PackagePlanService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PackagePlanController extends Controller
{
    public function __construct(private readonly PackagePlanService $packagePlanService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return $this->success(PackagePlanResource::collection($this->packagePlanService->all()));
    }

    public function store(SavePackagePlanRequest $request): JsonResponse
    {
        return $this->success(
            new PackagePlanResource($this->packagePlanService->create($request->validated())),
            'Package créé avec succès.',
            201
        );
    }

    public function update(PackagePlan $packagePlan, SavePackagePlanRequest $request): JsonResponse
    {
        return $this->success(
            new PackagePlanResource($this->packagePlanService->update($packagePlan, $request->validated())),
            'Package mis à jour avec succès.'
        );
    }

    public function destroy(PackagePlan $packagePlan, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        $this->packagePlanService->delete($packagePlan);

        return $this->success(null, 'Package supprimé avec succès.');
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'superadmin', 403, 'Accès super-admin requis.');
    }
}
