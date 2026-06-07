<?php

namespace App\Domains\Analytics\Controllers;

use App\Domains\Analytics\Requests\AnalyticsReportRequest;
use App\Domains\Analytics\Services\AnalyticsService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function report(AnalyticsReportRequest $request): JsonResponse
    {
        return $this->success($this->analyticsService->report(
            $request->user()->tenant_id,
            $request->validated('period', 'last_6_months'),
        ));
    }
}
