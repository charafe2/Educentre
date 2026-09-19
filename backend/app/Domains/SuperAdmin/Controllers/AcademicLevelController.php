<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Requests\StoreAcademicLevelRequest;
use App\Domains\SuperAdmin\Requests\UpdateAcademicLevelRequest;
use App\Domains\SuperAdmin\Resources\AcademicLevelResource;
use App\Domains\SuperAdmin\Services\AcademicLevelCatalogService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicLevelController extends Controller
{
    public function __construct(private readonly AcademicLevelCatalogService $academicLevelCatalog) {}

    public function index(Request $request): JsonResponse
    {
        $levels = $this->academicLevelCatalog->all(
            $request->query('search'),
            $request->query('status'),
        );

        return $this->success(AcademicLevelResource::collection($levels));
    }

    public function store(StoreAcademicLevelRequest $request): JsonResponse
    {
        $level = $this->academicLevelCatalog->create($request->validated());

        return $this->success(['id' => $level->id], 'Niveau créé avec succès.', 201);
    }

    public function update(int $id, UpdateAcademicLevelRequest $request): JsonResponse
    {
        $this->academicLevelCatalog->update($id, $request->validated());

        return $this->success(null, 'Niveau mis à jour avec succès.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->academicLevelCatalog->delete($id);

        return $this->success(null, 'Niveau supprimé avec succès.');
    }
}
