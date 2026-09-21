<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\PackagePlan;
use App\Domains\Core\Models\Subscription;
use App\Domains\Core\Scopes\TenantScope;
use App\Models\AccountGroup;
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
                $emailChanged = $owner->email !== $data['email'];
                $passwordChanged = ! empty($data['password']);

                $owner->name = $data['ownerName'];
                $owner->email = $data['email'];
                // A blank password field means "leave it alone", not "clear it".
                if ($passwordChanged) {
                    $owner->password = Hash::make($data['password']);
                }
                $owner->save();

                // Grouped accounts share one login across all their owner
                // rows — an edit here must reach the siblings too, or the
                // ones left behind stop being able to log in at all.
                if (($emailChanged || $passwordChanged) && $centre->tenant?->account_group_id) {
                    $this->propagateOwnerCredentials($centre->tenant, $owner);
                }
            }

            if ($centre->tenant) {
                $this->syncSubscription($centre->tenant, $data['plan']);
            }

            return $centre->fresh(['tenant.accountGroup']);
        });
    }

    /**
     * Marks the account as multi-centre eligible. This gates only the
     * "add centre" action below — the login picker itself is driven by how
     * many owner rows share an email (see AuthService::login), so toggling
     * this off later never breaks an already-grouped account.
     */
    public function enableMultitenant(Centre $centre): Centre
    {
        return DB::transaction(function () use ($centre) {
            $tenant = $centre->tenant;

            if ($tenant->account_group_id) {
                $tenant->accountGroup->update(['is_multitenant' => true]);
            } else {
                $group = AccountGroup::create(['label' => $centre->name, 'is_multitenant' => true]);
                $tenant->update(['account_group_id' => $group->id]);
            }

            return $centre->fresh(['tenant.accountGroup']);
        });
    }

    public function disableMultitenant(Centre $centre): Centre
    {
        $group = $centre->tenant?->accountGroup;

        abort_if(! $group, 422, "Ce compte n'est pas multi-centres.");

        $group->update(['is_multitenant' => false]);

        return $centre->fresh(['tenant.accountGroup']);
    }

    /**
     * Adds a new centre to an already-multitenant account, reusing the
     * group owner's exact name/email/password hash. There is deliberately
     * no email/password field in AddSiblingCentreRequest at all — nothing
     * client-supplied can create a credential collision here.
     */
    public function addSiblingCentre(Centre $anchorCentre, array $data): Centre
    {
        $tenant = $anchorCentre->tenant;
        $group = $tenant?->accountGroup;

        abort_if(! $group || ! $group->is_multitenant, 422, "Ce compte n'est pas activé pour le multi-centres.");

        $owner = User::where('tenant_id', $tenant->id)->where('is_owner', true)->firstOrFail();

        return DB::transaction(function () use ($data, $group, $owner) {
            $newTenant = Tenant::create([
                'account_group_id' => $group->id,
                'name' => $data['centreName'],
                'slug' => $this->uniqueSlug($data['centreName']),
                'status' => 'active',
            ]);

            $centre = Centre::create([
                'tenant_id' => $newTenant->id,
                'name' => $data['centreName'],
                'type' => $data['centreType'] ?? null,
                'city' => $data['city'] ?? null,
                'phone' => $data['phone'] ?? null,
                'is_active' => true,
            ]);

            $newOwner = User::create([
                'tenant_id' => $newTenant->id,
                'name' => $owner->name,
                'email' => $owner->email,
                // Throwaway value, immediately overwritten below — see
                // SettingsUsersController::store() for why this must be a
                // raw update rather than an Eloquent-hashed assignment.
                'password' => Str::random(40),
                'role' => 'admin',
                'status' => 'active',
                'is_owner' => true,
            ]);
            DB::table('users')->where('id', $newOwner->id)->update(['password' => $owner->password]);

            $this->syncSubscription($newTenant, $data['plan']);

            return $centre->fresh(['tenant.accountGroup']);
        });
    }

    /** See update()'s call site — keeps every owner row in a group authenticating identically. */
    private function propagateOwnerCredentials(Tenant $tenant, User $owner): void
    {
        $siblingIds = User::withoutGlobalScope(TenantScope::class)
            ->where('is_owner', true)
            ->where('id', '!=', $owner->id)
            ->whereHas('tenant', fn ($q) => $q->where('account_group_id', $tenant->account_group_id))
            ->pluck('id');

        if ($siblingIds->isNotEmpty()) {
            DB::table('users')->whereIn('id', $siblingIds)->update([
                'email' => $owner->email,
                'password' => $owner->password, // already hashed — copied verbatim
            ]);
        }
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
