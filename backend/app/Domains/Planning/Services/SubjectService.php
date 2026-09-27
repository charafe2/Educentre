<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\Subject;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Collection;

class SubjectService
{
    /**
     * Subjects a tenant's users may see and pick from — either assigned by
     * the Super Admin or self-added via addForTenant() below — and
     * currently active.
     */
    public function assignedFor(int $tenantId): Collection
    {
        $tenant = Tenant::find($tenantId);

        if ($tenant === null) {
            return new Collection();
        }

        return $tenant->subjects()->where('status', 'active')->orderBy('name')->get();
    }

    /**
     * Self-service subject creation for a tenant, mirroring
     * AcademicLevelService::addForTenant() — the catalog (`subjects.name`)
     * is still global and unique, so a name another centre already added is
     * reused rather than duplicated, and just gets attached to this tenant.
     */
    public function addForTenant(int $tenantId, string $name): Subject
    {
        $tenant = Tenant::findOrFail($tenantId);
        $name = trim($name);

        $subject = Subject::withTrashed()->where('name', $name)->first();

        if ($subject === null) {
            $subject = Subject::create(['name' => $name, 'status' => 'active', 'color' => '#1d4ed8', 'bg_color' => '#dbeafe']);
        } elseif ($subject->trashed()) {
            $subject->restore();
            $subject->update(['status' => 'active']);
        }

        if (! $tenant->subjects()->where('subjects.id', $subject->id)->exists()) {
            $tenant->subjects()->attach($subject->id);
        }

        return $subject;
    }

    /** Detaches a subject from this tenant only — the global catalog row (and every other tenant's assignment) is untouched. */
    public function removeForTenant(int $tenantId, int $subjectId): void
    {
        Tenant::findOrFail($tenantId)->subjects()->detach($subjectId);
    }
}
