<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Requests\StoreSuperAdminAccountRequest;
use App\Domains\SuperAdmin\Requests\UpdateSuperAdminAccountRequest;
use App\Domains\SuperAdmin\Resources\SuperAdminAccountResource;
use App\Domains\SuperAdmin\Services\SuperAdminAccountService;
use App\Http\Controllers\Controller;
use App\Models\SuperAdmin;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SuperAdminAccountController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly SuperAdminAccountService $accounts) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        return $this->success(
            SuperAdminAccountResource::collection($this->accounts->list($filters))
        );
    }

    public function show(int $id): JsonResponse
    {
        return $this->success(
            SuperAdminAccountResource::make(SuperAdmin::findOrFail($id))
        );
    }

    public function store(StoreSuperAdminAccountRequest $request): JsonResponse
    {
        return $this->success(
            data: SuperAdminAccountResource::make($this->accounts->create($request->validated())),
            message: 'Compte super-admin créé.',
            code: 201,
        );
    }

    public function update(UpdateSuperAdminAccountRequest $request, int $id): JsonResponse
    {
        $account = SuperAdmin::findOrFail($id);
        $data = $request->validated();

        $suspending = ($data['status'] ?? $account->status()) === 'suspended';

        if ($suspending && $account->is_active) {
            if ($denial = $this->denyLosingAccess($request, $account, 'suspendre')) {
                return $denial;
            }
        }

        return $this->success(
            data: SuperAdminAccountResource::make($this->accounts->update($account, $data)),
            message: 'Compte super-admin mis à jour.',
        );
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $account = SuperAdmin::findOrFail($id);

        if ($account->is_active && $denial = $this->denyLosingAccess($request, $account, 'suspendre')) {
            return $denial;
        }

        return $this->success(
            data: SuperAdminAccountResource::make($this->accounts->toggleStatus($account)),
            message: 'Statut du compte mis à jour.',
        );
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $account = SuperAdmin::findOrFail($id);

        if ($denial = $this->denyLosingAccess($request, $account, 'supprimer')) {
            return $denial;
        }

        $this->accounts->delete($account);

        return $this->success(message: 'Compte super-admin supprimé.');
    }

    /**
     * Blocks an operator from revoking their own access.
     *
     * This is the whole lockout protection. A separate "don't remove the last
     * active account" check would be unreachable: the middleware only admits an
     * active caller, so the sole active account is always the caller's own and
     * is already stopped here.
     */
    private function denyLosingAccess(Request $request, SuperAdmin $account, string $verb): ?JsonResponse
    {
        if ($request->user()?->getKey() === $account->getKey()) {
            return $this->error("Vous ne pouvez pas {$verb} votre propre compte.", null, 422);
        }

        return null;
    }
}
