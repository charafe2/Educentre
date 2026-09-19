<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Planning\Models\AcademicLevel;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Students\Models\Student;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class AcademicLevelCatalogService
{
    public function all(?string $search, ?string $status): Collection
    {
        return AcademicLevel::query()
            ->withCount('tenants')
            ->when($search, fn ($query) => $query->where('name', 'like', '%'.$search.'%'))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderBy('name')
            ->get()
            ->loadMissing('tenants');
    }

    public function create(array $data): AcademicLevel
    {
        return AcademicLevel::create([
            'name' => trim($data['name']),
            'status' => $data['status'] ?? 'active',
        ]);
    }

    public function update(int $id, array $data): AcademicLevel
    {
        $level = AcademicLevel::query()->findOrFail($id);

        $level->update([
            'name' => isset($data['name']) ? trim($data['name']) : $level->name,
            'status' => $data['status'] ?? $level->status,
        ]);

        return $level;
    }

    public function delete(int $id): void
    {
        $level = AcademicLevel::query()->withCount('tenants')->findOrFail($id);

        if ($level->tenants_count > 0) {
            throw ValidationException::withMessages([
                'name' => ['Ce niveau est assigné à au moins un centre. Retirez-le de tous les centres avant de le supprimer.'],
            ]);
        }

        $usedByClass = CourseClass::query()->withoutGlobalScopes()->where('level', $level->name)->exists();
        $usedByStudent = Student::query()->withoutGlobalScopes()->where('school_level', $level->name)->exists();

        if ($usedByClass || $usedByStudent) {
            throw ValidationException::withMessages([
                'name' => ['Ce niveau est utilisé par au moins une classe ou un élève existant et ne peut pas être supprimé.'],
            ]);
        }

        $level->delete();
    }
}
