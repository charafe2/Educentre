<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Requests\StoreSessionAttendanceRequest;
use App\Domains\Planning\Resources\SessionAttendanceResource;
use App\Domains\Planning\Services\SessionAttendanceService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionAttendanceController extends Controller
{
    public function __construct(
        private readonly SessionAttendanceService $attendanceService
    ) {}

    public function index(int $sessionId, Request $request): JsonResponse
    {
        $records = $this->attendanceService->all(
            $request->user()->tenant_id,
            $sessionId,
        );

        return $this->success(SessionAttendanceResource::collection($records));
    }

    public function store(int $sessionId, StoreSessionAttendanceRequest $request): JsonResponse
    {
        $records = $this->attendanceService->upsertMany(
            $request->user()->tenant_id,
            $sessionId,
            $request->validated('records'),
        );

        return $this->success(
            SessionAttendanceResource::collection($records),
            'Presences enregistrees avec succes.',
        );
    }
}
