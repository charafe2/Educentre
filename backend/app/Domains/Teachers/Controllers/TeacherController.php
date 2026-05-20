<?php

namespace App\Domains\Teachers\Controllers;

use App\Domains\Teachers\Requests\StoreTeacherRequest;
use App\Domains\Teachers\Requests\UpdateTeacherRequest;
use App\Domains\Teachers\Resources\TeacherResource;
use App\Domains\Teachers\Services\TeacherService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TeacherController extends Controller
{
    public function __construct(
        private readonly TeacherService $teacherService
    ) {}

    public function index(): JsonResponse
    {
        $teachers = $this->teacherService->all();
        return $this->success(TeacherResource::collection($teachers));
    }

    public function show(int $id): JsonResponse
    {
        $teacher = $this->teacherService->find($id);
        return $this->success(new TeacherResource($teacher));
    }

    public function store(StoreTeacherRequest $request): JsonResponse
    {
        $teacher = $this->teacherService->create([
            ...$request->validated(),
            'tenant_id' => 1,
        ]);
        return $this->success(
            ['id' => $teacher->id],
            'Professeur créé avec succès.',
            201
        );
    }

    public function update(int $id, UpdateTeacherRequest $request): JsonResponse
    {
        $this->teacherService->update($id, $request->validated());
        return $this->success(null, 'Professeur mis à jour avec succès.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->teacherService->delete($id);
        return $this->success(null, 'Professeur supprimé avec succès.');
    }
}
