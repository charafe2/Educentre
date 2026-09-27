<?php

namespace App\Domains\Analytics\Controllers;

use App\Domains\Analytics\Requests\AnalyticsReportRequest;
use App\Domains\Analytics\Services\AnalyticsService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analyticsService) {}

    public function report(AnalyticsReportRequest $request): JsonResponse
    {
        return $this->success($this->analyticsService->report(
            $request->user()->tenant_id,
            $request->validated('period', 'last_6_months'),
            max(1, $request->integer('teacher_page', 1)),
            max(1, min(50, $request->integer('teacher_per_page', 8))),
        ));
    }

    public function attendanceThisWeek(Request $request): JsonResponse
    {
        return $this->success([
            'rate' => $this->analyticsService->weeklyAttendanceRate($request->user()->tenant_id),
        ]);
    }
}
