<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Group;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class GroupService
{
    public function all(int $tenantId): Collection
    {
        return Group::with('enrollments')->where('tenant_id', $tenantId)->get();
    }

    /**
     * The group number is always assigned here as the class's highest number
     * + 1. A number computed by the client from its own (possibly stale) list
     * is ignored: that is how repeated clicks used to pile up duplicate "G2"s.
     */
    public function create(array $data): Group
    {
        return DB::transaction(function () use ($data) {
            // Serialises concurrent creations for the same class so two
            // requests can't both read the same max and share a number.
            CourseClass::query()->whereKey($data['classeId'])->lockForUpdate()->first();

            $group = Group::create([
                'tenant_id' => $data['tenant_id'],
                'class_id' => $data['classeId'],
                'group_number' => $this->nextGroupNumber($data['classeId']),
                'max_capacity' => $data['maxCapacity'] ?? 2,
            ]);

            if (!empty($data['studentIds'])) {
                Enrollment::where('tenant_id', $data['tenant_id'])
                    ->where('class_id', $data['classeId'])
                    ->whereIn('student_id', $data['studentIds'])
                    ->update(['group_id' => $group->id]);
            }

            return $group->load('enrollments');
        });
    }

    private function nextGroupNumber(int $classId): int
    {
        return (int) Group::withTrashed()->where('class_id', $classId)->max('group_number') + 1;
    }

    public function updateCapacity(int $id, int $tenantId, int $maxCapacity): Group
    {
        $group = Group::where('tenant_id', $tenantId)->findOrFail($id);
        $group->update(['max_capacity' => $maxCapacity]);
        return $group;
    }

    public function moveStudent(int $tenantId, int $studentId, ?int $fromGroupId, int $toGroupId): void
    {
        $toGroup = Group::with('courseClass')
            ->where('tenant_id', $tenantId)
            ->findOrFail($toGroupId);

        $enrollment = Enrollment::where('tenant_id', $tenantId)
            ->where('student_id', $studentId)
            ->where('class_id', $toGroup->class_id)
            ->first();

        if ($enrollment) {
            $enrollment->update(['group_id' => $toGroupId]);

            if ($fromGroupId !== null && $fromGroupId !== $toGroupId) {
                Enrollment::where('tenant_id', $tenantId)
                    ->where('student_id', $studentId)
                    ->where('group_id', $fromGroupId)
                    ->where('id', '!=', $enrollment->id)
                    ->update(['group_id' => null]);
            }

            return;
        }

        if ($fromGroupId === null || $fromGroupId === $toGroupId) {
            return;
        }

        $fromGroup = Group::with('courseClass')
            ->where('tenant_id', $tenantId)
            ->find($fromGroupId);
        if (!$fromGroup || !$this->isSameSubjectAndLevel($fromGroup, $toGroup)) {
            return;
        }

        Enrollment::where('tenant_id', $tenantId)
            ->where('student_id', $studentId)
            ->where('group_id', $fromGroupId)
            ->update([
                'class_id' => $toGroup->class_id,
                'group_id' => $toGroupId,
            ]);
    }

    private function isSameSubjectAndLevel(Group $fromGroup, Group $toGroup): bool
    {
        $fromClass = $fromGroup->courseClass;
        $toClass = $toGroup->courseClass;

        if (!$fromClass || !$toClass) {
            return false;
        }

        return $fromClass->level === $toClass->level
            && mb_strtolower(trim($fromClass->subject)) === mb_strtolower(trim($toClass->subject));
    }
}
