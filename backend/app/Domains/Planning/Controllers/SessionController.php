<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Requests\StoreSessionRequest;
use App\Domains\Planning\Requests\UpdateSessionRequest;
use App\Domains\Planning\Resources\SessionResource;
use App\Domains\Planning\Services\SessionService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function __construct(
        private readonly SessionService $sessionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = [];

        if ($request->has('day')) {
            $filters['day'] = $request->integer('day');
        }

        if ($request->has('classeId')) {
            $filters['classeId'] = $request->integer('classeId');
        }

        if ($request->has('isCancelled')) {
            $filters['isCancelled'] = $request->boolean('isCancelled');
        }

        $sessions = $this->sessionService->all($request->user()->tenant_id, $filters);

        return $this->success(SessionResource::collection($sessions));
    }

    public function today(Request $request): JsonResponse
    {
        $day = now()->startOfDay()->dayOfWeekIso - 1;

        if ($day < 0 || $day > 5) {
            return $this->success(collect());
        }

        $sessions = $this->sessionService->today($request->user()->tenant_id, $day);

        return $this->success(SessionResource::collection($sessions));
    }

    public function store(StoreSessionRequest $request): JsonResponse
    {
        $session = $this->sessionService->create(
            $request->user()->tenant_id,
            $request->validated()
        );

        return $this->success(
            new SessionResource($session),
            'Seance creee avec succes.',
            201
        );
    }

    public function update(int $id, UpdateSessionRequest $request): JsonResponse
    {
        $session = $this->sessionService->update(
            $request->user()->tenant_id,
            $id,
            $request->validated()
        );

        return $this->success(new SessionResource($session), 'Seance mise a jour avec succes.');
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $session = $this->sessionService->cancel(
            $request->user()->tenant_id,
            $id,
            $data['reason']
        );

        return $this->success(new SessionResource($session), 'Seance annulee avec succes.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->sessionService->delete($request->user()->tenant_id, $id);

        return $this->success(null, 'Seance supprimee avec succes.');
    }
}
