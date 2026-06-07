<?php

namespace App\Domains\Retention\Controllers;

use App\Domains\Retention\Services\StudentAttritionRiskService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentAttritionRiskController extends Controller
{
    public function __construct(private readonly StudentAttritionRiskService $riskService) {}

    public function index(Request $request): JsonResponse
    {
        return $this->success([
            'rule' => $this->riskService->rule(),
            'students' => $this->riskService->all($request->user()->tenant_id),
        ]);
    }
}
