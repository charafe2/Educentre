<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Requests\StoreClassRequest;
use App\Domains\Planning\Requests\UpdateClassRequest;
use App\Domains\Planning\Resources\ClassResource;
use App\Domains\Planning\Services\ClassService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ClassController extends Controller
{
    public function __construct(
        private readonly ClassService $classService
    ) {}

    public function index(): JsonResponse
    {
        $classes = $this->classService->all();
        return $this->success(ClassResource::collection($classes));
    }

    public function show(int $id): JsonResponse
    {
        $class = $this->classService->find($id);
        return $this->success(new ClassResource($class));
    }

    public function store(StoreClassRequest $request): JsonResponse
    {
        $class = $this->classService->create([
            ...$request->validated(),
            'tenant_id' => 1,
        ]);
        return $this->success(
            ['id' => $class->id],
            'Classe créée avec succès.',
            201
        );
    }

    public function update(int $id, UpdateClassRequest $request): JsonResponse
    {
        $this->classService->update($id, $request->validated());
        return $this->success(null, 'Classe mise à jour avec succès.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->classService->delete($id);
        return $this->success(null, 'Classe supprimée avec succès.');
    }
}
