<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Subject;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class SubjectService
{
    public function all(int $tenantId): Collection
    {
        return Subject::query()->where('tenant_id', $tenantId)->orderBy('name')->get();
    }

    public function create(array $data): Subject
    {
        return Subject::create([
            'tenant_id' => $data['tenant_id'],
            'name' => trim($data['name']),
            'color' => $data['color'] ?? '#1d4ed8',
            'bg_color' => $data['bgColor'] ?? '#dbeafe',
        ]);
    }

    public function update(int $tenantId, int $id, array $data): Subject
    {
        $subject = Subject::query()->where('tenant_id', $tenantId)->findOrFail($id);
        $oldName = $subject->name;
        $newName = isset($data['name']) ? trim($data['name']) : $oldName;

        $subject->update([
            'name' => $newName,
            'color' => $data['color'] ?? $subject->color,
            'bg_color' => $data['bgColor'] ?? $subject->bg_color,
        ]);

        // Renaming a subject in the catalog propagates to every class already using it,
        // so the owner never has to touch classes one by one after a rename.
        if ($newName !== $oldName) {
            CourseClass::query()
                ->where('tenant_id', $tenantId)
                ->where('subject', $oldName)
                ->update(['subject' => $newName]);
        }

        return $subject;
    }

    public function delete(int $tenantId, int $id): void
    {
        $subject = Subject::query()->where('tenant_id', $tenantId)->findOrFail($id);

        $inUse = CourseClass::query()
            ->where('tenant_id', $tenantId)
            ->where('subject', $subject->name)
            ->exists();

        if ($inUse) {
            throw ValidationException::withMessages([
                'name' => ['Cette matière est utilisée par au moins une classe. Modifiez ou supprimez ces classes avant de la supprimer.'],
            ]);
        }

        $subject->delete();
    }
}
