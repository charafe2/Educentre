<?php

namespace App\Domains\Planning\Controllers;

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
        $subjects = $this->subjectService->assignedFor($request->user()->tenant_id);

        return $this->success(SubjectResource::collection($subjects));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ], [
            'name.required' => 'Le nom de la matière est requis.',
        ]);

        $subject = $this->subjectService->addForTenant($request->user()->tenant_id, $validated['name']);

        return $this->success(SubjectResource::make($subject), 'Matière ajoutée.', 201);
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->subjectService->removeForTenant($request->user()->tenant_id, $id);

        return $this->success(null, 'Matière retirée.');
    }
}
