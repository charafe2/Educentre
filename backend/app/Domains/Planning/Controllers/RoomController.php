<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Resources\RoomResource;
use App\Domains\Planning\Services\RoomService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function __construct(
        private readonly RoomService $roomService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $rooms = $this->roomService->all($request->user()->tenant_id);

        return $this->success(RoomResource::collection($rooms));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'capacity' => ['nullable', 'integer', 'min:0'],
        ], [
            'name.required' => 'Le nom de la salle est requis.',
        ]);

        $room = $this->roomService->create($request->user()->tenant_id, $validated);

        return $this->success(RoomResource::make($room), 'Salle ajoutée.', 201);
    }
}
