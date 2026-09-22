<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\AcademicLevel;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Collection;

class AcademicLevelService
{
    /**
     * Academic levels a tenant's users may see and pick from — either
     * assigned by the Super Admin or self-added via addForTenant() below —
     * and currently active.
     */
    public function assignedFor(int $tenantId): Collection
    {
        $tenant = Tenant::find($tenantId);

        if ($tenant === null) {
            return new Collection();
        }

        return $tenant->academicLevels()->where('status', 'active')->orderBy('name')->get();
    }

    /**
     * Self-service level creation for a tenant (e.g. "1ère année Bac"). The
     * catalog (`academic_levels.name`) is still global and unique — a name
     * that another centre already added is reused rather than duplicated,
     * and just gets attached to this tenant too, matching how the Super
     * Admin's own catalog already works (one name, many tenants via the
     * `academic_level_tenant` pivot).
     */
    public function addForTenant(int $tenantId, string $name): AcademicLevel
    {
        $tenant = Tenant::findOrFail($tenantId);
        $name = trim($name);

        $level = AcademicLevel::withTrashed()->where('name', $name)->first();

        if ($level === null) {
            $level = AcademicLevel::create(['name' => $name, 'status' => 'active']);
        } elseif ($level->trashed()) {
            $level->restore();
            $level->update(['status' => 'active']);
        }

        if (! $tenant->academicLevels()->where('academic_levels.id', $level->id)->exists()) {
            $tenant->academicLevels()->attach($level->id);
        }

        return $level;
    }
}
