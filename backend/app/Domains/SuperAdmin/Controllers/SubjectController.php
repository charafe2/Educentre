<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Requests\StoreSubjectRequest;
use App\Domains\SuperAdmin\Requests\UpdateSubjectRequest;
use App\Domains\SuperAdmin\Resources\SubjectResource;
use App\Domains\SuperAdmin\Services\SubjectCatalogService;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly SubjectCatalogService $subjectCatalog) {}

    public function index(Request $request): JsonResponse
    {
        $subjects = $this->subjectCatalog->all(
            $request->query('search'),
            $request->query('status'),
        );

        return $this->success(SubjectResource::collection($subjects));
    }

    public function store(StoreSubjectRequest $request): JsonResponse
    {
        $subject = $this->subjectCatalog->create($request->validated());

        return $this->success(['id' => $subject->id], 'Matière créée avec succès.', 201);
    }

    public function update(int $id, UpdateSubjectRequest $request): JsonResponse
    {
        $this->subjectCatalog->update($id, $request->validated());

        return $this->success(null, 'Matière mise à jour avec succès.');
    }

    public function destroy(int $id): JsonResponse
    {
        $this->subjectCatalog->delete($id);

        return $this->success(null, 'Matière supprimée avec succès.');
    }
}
