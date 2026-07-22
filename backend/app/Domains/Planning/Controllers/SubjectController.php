<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Requests\StoreSubjectRequest;
use App\Domains\Planning\Requests\UpdateSubjectRequest;
use App\Domains\Planning\Resources\SubjectResource;
use App\Domains\Planning\Services\SubjectService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function __construct(
        private readonly SubjectService $subjectService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $subjects = $this->subjectService->all($request->user()->tenant_id);

        return $this->success(SubjectResource::collection($subjects));
    }

    public function store(StoreSubjectRequest $request): JsonResponse
    {
        $subject = $this->subjectService->create([
            ...$request->validated(),
            'tenant_id' => $request->user()->tenant_id,
        ]);

        return $this->success(
            ['id' => $subject->id],
            'Matière créée avec succès.',
            201
        );
    }

    public function update(int $id, UpdateSubjectRequest $request): JsonResponse
    {
        $this->subjectService->update($request->user()->tenant_id, $id, $request->validated());

        return $this->success(null, 'Matière mise à jour avec succès.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->subjectService->delete($request->user()->tenant_id, $id);

        return $this->success(null, 'Matière supprimée avec succès.');
    }
}
