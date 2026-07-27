<?php

namespace App\Domains\Planning\Controllers;

use App\Domains\Planning\Requests\StoreGroupRequest;
use App\Domains\Planning\Requests\UpdateGroupCapacityRequest;
use App\Domains\Planning\Requests\MoveStudentRequest;
use App\Domains\Planning\Resources\GroupResource;
use App\Domains\Planning\Services\GroupService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function __construct(
        private readonly GroupService $groupService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $groups = $this->groupService->all($request->user()->tenant_id);
        return $this->success(GroupResource::collection($groups));
    }

    public function store(StoreGroupRequest $request): JsonResponse
    {
        $group = $this->groupService->create([
            ...$request->validated(),
            'tenant_id' => $request->user()->tenant_id,
        ]);
        return $this->success(
            ['id' => $group->id],
            'Groupe créé avec succès.',
            201
        );
    }

    public function updateCapacity(int $id, UpdateGroupCapacityRequest $request): JsonResponse
    {
        $this->groupService->updateCapacity($id, $request->user()->tenant_id, $request->validated()['maxCapacity']);
        return $this->success(null, 'Capacité mise à jour avec succès.');
    }

    public function moveStudent(MoveStudentRequest $request): JsonResponse
    {
        $this->groupService->moveStudent(
            $request->user()->tenant_id,
            $request->validated()['studentId'],
            $request->validated()['fromGroupId'],
            $request->validated()['toGroupId'],
        );
        return $this->success(null, 'Élève déplacé avec succès.');
    }
}
