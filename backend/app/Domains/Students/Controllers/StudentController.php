<?php

namespace App\Domains\Students\Controllers;

use App\Domains\Students\Requests\StoreStudentRequest;
use App\Domains\Students\Requests\UpdateStudentRequest;
use App\Domains\Students\Resources\StudentResource;
use App\Domains\Students\Services\StudentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function __construct(
        private readonly StudentService $studentService
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            $students = $this->studentService->all($request->user()->tenant_id);

            return $this->success(StudentResource::collection($students));
        }

        $students = $this->studentService->paginate($request->user()->tenant_id, $request->only([
            'page',
            'per_page',
            'search',
            'level',
            'status',
            'payment_status',
        ]));

        return $this->success(
            StudentResource::collection($students->items()),
            meta: [
                'pagination' => [
                    'current_page' => $students->currentPage(),
                    'per_page' => $students->perPage(),
                    'total' => $students->total(),
                    'last_page' => $students->lastPage(),
                    'from' => $students->firstItem(),
                    'to' => $students->lastItem(),
                ],
                'summary' => $this->studentService->summary($request->user()->tenant_id),
            ]
        );
    }

    public function store(StoreStudentRequest $request): JsonResponse
    {
        $student = $this->studentService->create([
            ...$request->validated(),
            'tenant_id' => $request->user()->tenant_id,
        ]);

        return $this->success(
            ['id' => $student->id],
            'Étudiant créé avec succès.',
            201
        );
    }

    public function update(int $id, UpdateStudentRequest $request): JsonResponse
    {
        $this->studentService->update($request->user()->tenant_id, $id, $request->validated());

        return $this->success(null, 'Étudiant mis à jour avec succès.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->studentService->delete($request->user()->tenant_id, $id);

        return $this->success(null, 'Étudiant supprimé avec succès.');
    }
}
