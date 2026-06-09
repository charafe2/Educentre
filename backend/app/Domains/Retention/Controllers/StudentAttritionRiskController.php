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
        $result = $this->riskService->paginate(
            $request->user()->tenant_id,
            max(1, $request->integer('page', 1)),
            max(1, min(50, $request->integer('per_page', 8))),
        );

        return $this->success([
            'rule' => $this->riskService->rule(),
            'students' => $result['students'],
        ], meta: [
            'pagination' => $result['pagination'],
        ]);
    }
}
