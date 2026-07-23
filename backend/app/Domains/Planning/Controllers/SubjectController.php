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
}
