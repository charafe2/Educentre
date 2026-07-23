<?php

namespace App\Domains\Planning\Services;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Collection;

class AcademicLevelService
{
    /**
     * Academic levels a tenant's users may see and pick from — assigned by
     * the Super Admin and currently active. Tenants can no longer create,
     * rename, or delete academic levels themselves.
     */
    public function assignedFor(int $tenantId): Collection
    {
        $tenant = Tenant::find($tenantId);

        if ($tenant === null) {
            return new Collection();
        }

        return $tenant->academicLevels()->where('status', 'active')->orderBy('name')->get();
    }
}
