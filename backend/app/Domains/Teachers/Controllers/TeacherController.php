<?php

namespace App\Domains\Teachers\Controllers;

use App\Domains\Teachers\Requests\StoreTeacherRequest;
use App\Domains\Teachers\Requests\UpdateTeacherRequest;
use App\Domains\Teachers\Resources\TeacherResource;
use App\Domains\Teachers\Services\TeacherService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function __construct(
        private readonly TeacherService $teacherService
    ) {}

    public function index(Request $request): JsonResponse
    {
        if ($request->boolean('all')) {
            $teachers = $this->teacherService->all($request->user()->tenant_id);

            return $this->success(TeacherResource::collection($teachers));
        }

        $teachers = $this->teacherService->paginate($request->user()->tenant_id, $request->only([
            'page',
            'per_page',
            'search',
            'status',
        ]));

        return $this->success(
            TeacherResource::collection($teachers->items()),
            meta: [
                'pagination' => [
                    'current_page' => $teachers->currentPage(),
                    'per_page' => $teachers->perPage(),
                    'total' => $teachers->total(),
                    'last_page' => $teachers->lastPage(),
                    'from' => $teachers->firstItem(),
                    'to' => $teachers->lastItem(),
                ],
                'summary' => $this->teacherService->summary($request->user()->tenant_id),
            ]
        );
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $teacher = $this->teacherService->find($id, $request->user()->tenant_id);
        return $this->success(new TeacherResource($teacher));
    }

    public function store(StoreTeacherRequest $request): JsonResponse
    {
        $teacher = $this->teacherService->create([
            ...$request->validated(),
            'tenant_id' => $request->user()->tenant_id,
        ]);
        return $this->success(
            ['id' => $teacher->id, 'plainPassword' => $teacher->plainPassword],
            'Professeur créé avec succès.',
            201
        );
    }

    public function update(int $id, UpdateTeacherRequest $request): JsonResponse
    {
        $this->teacherService->update($id, $request->user()->tenant_id, $request->validated());
        return $this->success(null, 'Professeur mis à jour avec succès.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->teacherService->delete($id, $request->user()->tenant_id);
        return $this->success(null, 'Professeur supprimé avec succès.');
    }

    public function resetPassword(int $id, Request $request): JsonResponse
    {
        $plainPassword = $this->teacherService->resetPassword($id, $request->user()->tenant_id);
        return $this->success(['plainPassword' => $plainPassword], 'Mot de passe régénéré.');
    }

    public function suspend(int $id, Request $request): JsonResponse
    {
        $this->teacherService->suspend($id, $request->user()->tenant_id);
        return $this->success(null, "Accès suspendu.");
    }

    public function revoke(int $id, Request $request): JsonResponse
    {
        $this->teacherService->revoke($id, $request->user()->tenant_id);
        return $this->success(null, "Accès révoqué.");
    }

    public function reactivate(int $id, Request $request): JsonResponse
    {
        $this->teacherService->reactivate($id, $request->user()->tenant_id);
        return $this->success(null, "Accès réactivé.");
    }
}
