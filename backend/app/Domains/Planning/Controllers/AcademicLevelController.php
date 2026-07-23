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
}
