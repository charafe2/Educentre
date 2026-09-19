<?php

namespace App\Domains\SuperAdmin\Services;

use App\Models\SuperAdmin;
use Illuminate\Database\Eloquent\Collection;

class SuperAdminAccountService
{
    /**
     * @param  array{status?: string|null, search?: string|null}  $filters
     * @return Collection<int, SuperAdmin>
     */
    public function list(array $filters = []): Collection
    {
        return SuperAdmin::query()
            ->when(
                filled($filters['status'] ?? null),
                fn ($query) => $query->where('is_active', $filters['status'] === 'active')
            )
            ->when(
                filled($filters['search'] ?? null),
                fn ($query) => $query->where(function ($inner) use ($filters) {
                    $term = '%'.$filters['search'].'%';
                    $inner->where('name', 'like', $term)->orWhere('email', 'like', $term);
                })
            )
            ->orderBy('name')
            ->get();
    }

    public function create(array $data): SuperAdmin
    {
        return SuperAdmin::create([
            'name' => $data['name'],
            'email' => $data['email'],
            // Hashed by the model's 'hashed' cast.
            'password' => $data['password'],
            'is_active' => ($data['status'] ?? 'active') === 'active',
        ]);
    }

    public function update(SuperAdmin $account, array $data): SuperAdmin
    {
        $wasActive = $account->is_active;

        $attributes = [
            'name' => $data['name'],
            'email' => $data['email'],
            'is_active' => ($data['status'] ?? $account->status()) === 'active',
        ];

        // An omitted or blank password means "leave it alone" — the console
        // sends the field on every save, empty when it isn't being changed.
        if (filled($data['password'] ?? null)) {
            $attributes['password'] = $data['password'];
        }

        $account->update($attributes);

        if ($wasActive && ! $account->is_active) {
            $account->revokeAllTokens();
        }

        return $account->fresh();
    }

    public function toggleStatus(SuperAdmin $account): SuperAdmin
    {
        $account->update(['is_active' => ! $account->is_active]);

        if (! $account->is_active) {
            $account->revokeAllTokens();
        }

        return $account->fresh();
    }

    public function delete(SuperAdmin $account): void
    {
        $account->revokeAllTokens();
        $account->delete();
    }

    public function recordLogin(SuperAdmin $account): void
    {
        $account->forceFill(['last_login_at' => now()])->save();
    }
}
