<?php

namespace App\Domains\SuperAdmin\Services;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;

class SuperAdminAccountService
{
    public function all(): Collection
    {
        return User::query()
            ->where('role', 'superadmin')
            ->latest('created_at')
            ->get();
    }

    public function create(array $data): User
    {
        return User::create([
            'tenant_id' => $this->platformTenant()->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'superadmin',
            'status' => $data['status'],
        ]);
    }

    public function update(User $account, array $data): User
    {
        $attributes = [
            'name' => $data['name'],
            'email' => $data['email'],
            'status' => $data['status'],
        ];

        if (! empty($data['password'])) {
            $attributes['password'] = Hash::make($data['password']);
        }

        $account->update($attributes);

        return $account->refresh();
    }

    public function toggleStatus(User $account): User
    {
        $account->update(['status' => $account->status === 'active' ? 'suspended' : 'active']);

        return $account->refresh();
    }

    public function delete(User $account): void
    {
        $account->delete();
    }

    private function platformTenant(): Tenant
    {
        return Tenant::firstOrCreate(
            ['slug' => 'platform'],
            ['name' => 'Plateforme Moujtahid', 'status' => 'active']
        );
    }
}
