<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\PackagePlan;
use App\Domains\Core\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CentreService
{
    /**
     * Provision a whole client account: tenant, centre, owner user and
     * subscription. All four are written in one transaction — a centre without
     * its tenant or owner is unusable, and index() would render it as "-".
     */
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
                'name' => $data['centreName'],
                'type' => $data['centreType'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['phone'] ?? null,
                'is_active' => true,
            ]);

            User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['ownerName'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => 'admin',
                'status' => 'active',
                'is_owner' => true,
            ]);

            $this->syncSubscription($tenant, $data['plan']);

            return $centre->fresh(['tenant']);
        });
    }

    public function update(Centre $centre, array $data): Centre
    {
        return DB::transaction(function () use ($centre, $data) {
            $centre->update([
                'name' => $data['centreName'],
                'type' => $data['centreType'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['phone'] ?? null,
            ]);

            $centre->tenant?->update(['name' => $data['centreName']]);

            $owner = $centre->tenant?->users()->orderBy('id')->first();
            if ($owner) {
                $owner->name = $data['ownerName'];
                $owner->email = $data['email'];
                // A blank password field means "leave it alone", not "clear it".
                if (! empty($data['password'])) {
                    $owner->password = Hash::make($data['password']);
                }
                $owner->save();
            }

            if ($centre->tenant) {
                $this->syncSubscription($centre->tenant, $data['plan']);
            }

            return $centre->fresh(['tenant']);
        });
    }

    public function toggleStatus(Centre $centre): Centre
    {
        $centre->update(['is_active' => ! $centre->is_active]);

        return $centre->fresh(['tenant']);
    }

    /**
     * Soft-deletes the centre only. The tenant and its data are left intact:
     * subscriptions cascade on tenant delete, which would destroy billing
     * history, so removing a tenant is a deliberate separate operation.
     */
    public function delete(Centre $centre): void
    {
        $centre->delete();
    }

    /** Price comes from the catalogue, never from the request body. */
    private function syncSubscription(Tenant $tenant, string $planName): void
    {
        $price = (float) (PackagePlan::where('name', $planName)->value('monthly_price') ?? 0);

        $subscription = Subscription::where('tenant_id', $tenant->id)->latest('id')->first();

        if ($subscription) {
            $subscription->update(['plan' => $planName, 'monthly_price' => $price]);

            return;
        }

        Subscription::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'plan' => $planName,
            'monthly_price' => $price,
            'start_date' => now()->toDateString(),
            'status' => 'active',
        ]);
    }

    /** tenants.slug is unique, so two "Centre Al Manar" need distinct slugs. */
    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'centre';
        $slug = $base;
        $i = 2;

        while (Tenant::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
