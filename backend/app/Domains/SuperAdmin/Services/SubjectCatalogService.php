<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Subject;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class SubjectCatalogService
{
    public function all(?string $search, ?string $status): Collection
    {
        return Subject::query()
            ->withCount('tenants')
            ->when($search, fn ($query) => $query->where('name', 'like', '%'.$search.'%'))
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderBy('name')
            ->get()
            ->loadMissing('tenants');
    }

    public function create(array $data): Subject
    {
        return Subject::create([
            'name' => trim($data['name']),
            'status' => $data['status'] ?? 'active',
            'color' => $data['color'] ?? '#1d4ed8',
            'bg_color' => $data['bgColor'] ?? '#dbeafe',
        ]);
    }

    public function update(int $id, array $data): Subject
    {
        $subject = Subject::query()->findOrFail($id);

        $subject->update([
            'name' => isset($data['name']) ? trim($data['name']) : $subject->name,
            'status' => $data['status'] ?? $subject->status,
            'color' => $data['color'] ?? $subject->color,
            'bg_color' => $data['bgColor'] ?? $subject->bg_color,
        ]);

        return $subject;
    }

    public function delete(int $id): void
    {
        $subject = Subject::query()->withCount('tenants')->findOrFail($id);

        if ($subject->tenants_count > 0) {
            throw ValidationException::withMessages([
                'name' => ['Cette matière est assignée à au moins un centre. Retirez-la de tous les centres avant de la supprimer.'],
            ]);
        }

        $inUse = CourseClass::query()->where('subject', $subject->name)->exists();

        if ($inUse) {
            throw ValidationException::withMessages([
                'name' => ['Cette matière est utilisée par au moins une classe existante et ne peut pas être supprimée.'],
            ]);
        }

        $subject->delete();
    }
}
