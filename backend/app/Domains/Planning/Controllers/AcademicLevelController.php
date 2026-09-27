<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Resources\AcademicLevelResource;
use App\Domains\Planning\Services\AcademicLevelService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AcademicLevelController extends Controller
{
    public function __construct(
        private readonly AcademicLevelService $academicLevelService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $levels = $this->academicLevelService->assignedFor($request->user()->tenant_id);

        return $this->success(AcademicLevelResource::collection($levels));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
        ], [
            'name.required' => 'Le nom du niveau est requis.',
        ]);

        $level = $this->academicLevelService->addForTenant($request->user()->tenant_id, $validated['name']);

        return $this->success(AcademicLevelResource::make($level), 'Niveau ajouté.', 201);
    }
}
