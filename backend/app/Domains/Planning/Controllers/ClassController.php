<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Requests\StoreClassRequest;
use App\Domains\Planning\Requests\UpdateClassRequest;
use App\Domains\Planning\Resources\ClassResource;
use App\Domains\Planning\Services\ClassService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function __construct(
        private readonly ClassService $classService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $classes = $this->classService->all($request->user()->tenant_id);

        return $this->success(ClassResource::collection($classes));
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $class = $this->classService->find($request->user()->tenant_id, $id);

        return $this->success(new ClassResource($class));
    }

    public function store(StoreClassRequest $request): JsonResponse
    {
        $class = $this->classService->create([
            ...$request->validated(),
            'tenant_id' => $request->user()->tenant_id,
        ]);

        return $this->success(
            ['id' => $class->id],
            'Classe créée avec succès.',
            201
        );
    }

    public function update(int $id, UpdateClassRequest $request): JsonResponse
    {
        $this->classService->update($request->user()->tenant_id, $id, $request->validated());

        return $this->success(null, 'Classe mise à jour avec succès.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->classService->delete($request->user()->tenant_id, $id);

        return $this->success(null, 'Classe supprimée avec succès.');
    }
}
