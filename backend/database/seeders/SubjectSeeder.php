<?php

namespace Database\Seeders;

use App\Domains\Planning\Models\Subject;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

class SubjectSeeder extends Seeder
{
    /**
     * Global subject catalog, named to match the `classes.subject` strings
     * MoroccanDemoSeeder writes so demo classes line up with real catalog rows.
     */
    private const SUBJECTS = [
        'Mathématiques' => ['#1d4ed8', '#dbeafe'],
        'Physique-Chimie' => ['#7c3aed', '#ede9fe'],
        'SVT' => ['#15803d', '#dcfce7'],
        'Français' => ['#be123c', '#ffe4e6'],
        'Anglais' => ['#0369a1', '#e0f2fe'],
        'Arabe' => ['#b45309', '#fef3c7'],
        'Philosophie' => ['#4338ca', '#e0e7ff'],
        'Économie' => ['#0f766e', '#ccfbf1'],
        'Comptabilité' => ['#a16207', '#fef9c3'],
        'Informatique' => ['#334155', '#e2e8f0'],
        'Histoire-Géographie' => ['#9a3412', '#ffedd5'],
        'Éducation Islamique' => ['#166534', '#d1fae5'],
        'Préparation concours' => ['#c026d3', '#fae8ff'],
    ];

    /**
     * Idempotent: re-running updates colours, restores soft-deleted rows and
     * assigns every subject to every tenant (or only $tenantSlug when given)
     * without detaching anything the Super Admin assigned by hand.
     */
    public function run(?string $tenantSlug = null): void
    {
        $subjectIds = [];

        foreach (self::SUBJECTS as $name => [$color, $bgColor]) {
            $subject = Subject::withTrashed()->firstOrNew(['name' => $name]);

            if ($subject->trashed()) {
                $subject->restore();
            }

            $subject->fill(['color' => $color, 'bg_color' => $bgColor, 'status' => 'active'])->save();
            $subjectIds[] = $subject->id;
        }

        $tenants = Tenant::query()
            ->when($tenantSlug, fn ($query) => $query->where('slug', $tenantSlug))
            ->get();

        foreach ($tenants as $tenant) {
            $tenant->subjects()->syncWithoutDetaching($subjectIds);
        }

        $this->command?->info(sprintf(
            '%d matières créées et assignées à %d centre(s).',
            count($subjectIds),
            $tenants->count(),
        ));
    }
}
