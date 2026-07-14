<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminCentreService
{
    public function all(array $filters = []): Collection
    {
        $query = Centre::query()
            ->with(['tenant.users'])
            ->latest('created_at')
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%")
                        ->orWhereHas('tenant.users', fn ($users) => $users->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] ?? null, function ($query, string $status) {
                if ($status === 'active') {
                    $query->where('is_active', true);
                } elseif ($status === 'suspended') {
                    $query->where('is_active', false);
                } elseif ($status === 'trial') {
                    $query->whereHas('tenant', fn ($tenant) => $tenant->whereHas('subscriptions', fn ($subscriptions) => $subscriptions->where('status', 'trial')));
                }
            });

        return $this->hydrateComputedFields($query->get());
    }

    public function create(array $data): Centre
    {
        return DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['centreName'],
                'slug' => $this->uniqueSlug($data['centreName']),
                'status' => 'active',
            ]);

            $centre = Centre::create([
                'tenant_id' => $tenant->id,
                'uuid' => (string) Str::uuid(),
                'name' => $data['centreName'],
                'type' => $data['centreType'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['phone'] ?? null,
                'whatsapp_number' => $data['phone'] ?? null,
                'is_active' => true,
            ]);

            User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['ownerName'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'admin',
                'status' => 'active',
            ]);

            Subscription::create([
                'tenant_id' => $tenant->id,
                'uuid' => (string) Str::uuid(),
                'plan' => $data['plan'],
                'monthly_price' => $this->monthlyPriceForPlan($data['plan']),
                'start_date' => now()->toDateString(),
                'status' => 'trial',
            ]);

            return $this->find($centre->id);
        });
    }

    public function update(Centre $centre, array $data): Centre
    {
        DB::transaction(function () use ($centre, $data) {
            $centre->update([
                'name' => $data['centreName'],
                'type' => $data['centreType'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['phone'] ?? null,
                'whatsapp_number' => $data['phone'] ?? null,
            ]);

            $tenant = $centre->tenant;
            $tenant?->update(['name' => $data['centreName']]);

            $owner = $tenant?->users()->where('role', 'admin')->first() ?? $tenant?->users()->first();
            if ($owner) {
                $attributes = [
                    'name' => $data['ownerName'],
                    'email' => $data['email'],
                ];

                if (! empty($data['password'])) {
                    $attributes['password'] = Hash::make($data['password']);
                }

                $owner->update($attributes);
            }

            $subscription = Subscription::query()
                ->where('tenant_id', $centre->tenant_id)
                ->latest('id')
                ->first();

            if ($subscription) {
                $subscription->update([
                    'plan' => $data['plan'],
                    'monthly_price' => $this->monthlyPriceForPlan($data['plan']),
                    'status' => $centre->is_active ? 'active' : 'suspended',
                ]);
            } else {
                Subscription::create([
                    'tenant_id' => $centre->tenant_id,
                    'uuid' => (string) Str::uuid(),
                    'plan' => $data['plan'],
                    'monthly_price' => $this->monthlyPriceForPlan($data['plan']),
                    'start_date' => now()->toDateString(),
                    'status' => $centre->is_active ? 'active' : 'suspended',
                ]);
            }
        });

        return $this->find($centre->id);
    }

    public function toggleStatus(Centre $centre): Centre
    {
        $centre->update(['is_active' => ! $centre->is_active]);

        Subscription::query()
            ->where('tenant_id', $centre->tenant_id)
            ->latest('id')
            ->first()?->update(['status' => $centre->is_active ? 'active' : 'suspended']);

        $centre->tenant?->update(['status' => $centre->is_active ? 'active' : 'suspended']);

        return $this->find($centre->id);
    }

    public function delete(Centre $centre): void
    {
        DB::transaction(function () use ($centre) {
            $tenant = $centre->tenant;
            $centre->delete();
            $tenant?->delete();
        });
    }

    public function find(int $id): Centre
    {
        return $this->hydrateComputedFields(Centre::query()->with(['tenant.users'])->whereKey($id)->get())->firstOrFail();
    }

    private function hydrateComputedFields(Collection $centres): Collection
    {
        $tenantIds = $centres->pluck('tenant_id')->all();
        $subscriptions = Subscription::query()
            ->whereIn('tenant_id', $tenantIds)
            ->latest('id')
            ->get()
            ->unique('tenant_id')
            ->keyBy('tenant_id');

        $studentCounts = DB::table('students')
            ->whereIn('tenant_id', $tenantIds)
            ->select('tenant_id', DB::raw('count(*) as total'))
            ->groupBy('tenant_id')
            ->pluck('total', 'tenant_id');

        return $centres->each(function (Centre $centre) use ($subscriptions, $studentCounts) {
            $centre->setRelation('subscription', $subscriptions->get($centre->tenant_id));
            $centre->students_count = (int) ($studentCounts[$centre->tenant_id] ?? 0);
        });
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'centre';
        $slug = $base;
        $index = 2;

        while (Tenant::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$index;
            $index++;
        }

        return $slug;
    }

    private function monthlyPriceForPlan(string $plan): float
    {
        return match ($plan) {
            'Pro' => 1490,
            'Enterprise' => 2990,
            default => 690,
        };
    }
}
