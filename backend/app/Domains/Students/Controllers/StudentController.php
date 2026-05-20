<?php

namespace App\Domains\Students\Controllers;

use App\Domains\Students\Requests\StoreStudentRequest;
use App\Domains\Students\Requests\UpdateStudentRequest;
use App\Domains\Students\Resources\StudentResource;
use App\Domains\Students\Services\StudentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class StudentController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService
    ) {}

    public function index(): JsonResponse
    {
        $students = $this->studentService->all();
        return $this->success(StudentResource::collection($students));
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = $this->studentService->create([
            ...$request->validated(),
            'tenant_id' => 1,
        ]);
        return $this->success(
            ['id' => $student->id],
            'Étudiant créé avec succès.',
            201
        );
    }

    public function update(int $id, UpdateStudentRequest $request): JsonResponse
    {
        $this->studentService->update($id, $request->validated());
        return $this->success(null, 'Étudiant mis à jour avec succès.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->studentService->delete($id);
        return $this->success(null, 'Étudiant supprimé avec succès.');
    }
}
