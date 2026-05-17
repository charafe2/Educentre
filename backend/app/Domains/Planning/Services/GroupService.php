<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\Group;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\Eloquent\Collection;

class GroupService
{
    public function all(): Collection
    {
        return Group::with('enrollments')->get();
    }

    public function create(array $data): Group
    {
        $group = Group::create([
            'tenant_id' => $data['tenant_id'],
            'class_id' => $data['classeId'],
            'group_number' => $data['groupNumber'] ?? 1,
            'max_capacity' => $data['maxCapacity'] ?? 2,
        ]);

        if (!empty($data['studentIds'])) {
            Enrollment::where('class_id', $data['classeId'])
                ->whereIn('student_id', $data['studentIds'])
                ->update(['group_id' => $group->id]);
        }

        return $group->load('enrollments');
    }

    public function updateCapacity(int $id, int $maxCapacity): Group
    {
        $group = Group::findOrFail($id);
        $group->update(['max_capacity' => $maxCapacity]);
        return $group;
    }

    public function moveStudent(int $studentId, ?int $fromGroupId, int $toGroupId): void
    {
        $toGroup = Group::findOrFail($toGroupId);

        $enrollment = Enrollment::where('student_id', $studentId)
            ->where('class_id', $toGroup->class_id)
            ->first();

        if ($enrollment) {
            $enrollment->update(['group_id' => $toGroupId]);
        }
    }
}
