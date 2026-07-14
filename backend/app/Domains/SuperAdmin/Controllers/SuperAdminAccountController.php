<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Requests\SaveSuperAdminAccountRequest;
use App\Domains\SuperAdmin\Resources\SuperAdminAccountResource;
use App\Domains\SuperAdmin\Services\SuperAdminAccountService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminAccountController extends Controller
{
    public function __construct(private readonly SuperAdminAccountService $accountService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return $this->success(SuperAdminAccountResource::collection($this->accountService->all()));
    }

    public function store(SaveSuperAdminAccountRequest $request): JsonResponse
    {
        return $this->success(
            new SuperAdminAccountResource($this->accountService->create($request->validated())),
            'Compte super-admin créé avec succès.',
            201
        );
    }

    public function update(User $account, SaveSuperAdminAccountRequest $request): JsonResponse
    {
        abort_unless($account->role === 'superadmin', 404);

        return $this->success(
            new SuperAdminAccountResource($this->accountService->update($account, $request->validated())),
            'Compte super-admin mis à jour.'
        );
    }

    public function toggleStatus(User $account, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        abort_unless($account->role === 'superadmin', 404);
        abort_if($account->id === $request->user()->id, 422, 'Vous ne pouvez pas suspendre votre propre compte.');

        return $this->success(
            new SuperAdminAccountResource($this->accountService->toggleStatus($account)),
            'Statut du compte mis à jour.'
        );
    }

    public function destroy(User $account, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        abort_unless($account->role === 'superadmin', 404);
        abort_if($account->id === $request->user()->id, 422, 'Vous ne pouvez pas supprimer votre propre compte.');
        $this->accountService->delete($account);

        return $this->success(null, 'Compte super-admin supprimé.');
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'superadmin', 403, 'Accès super-admin requis.');
    }
}
