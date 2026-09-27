<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\ClassSession;
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
                'teacher_id' => $data['teacherId'] ?? null,
                'room_id' => $data['roomId'] ?? null,
                'monthly_price' => $data['monthlyPrice'] ?? null,
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

    /**
     * Teacher/room/price are per-group overrides (null clears an override,
     * back to inheriting the class's own value) — only send a key when the
     * owner actually meant to change it, same convention as ClassService.
     */
    public function update(int $id, int $tenantId, array $data): Group
    {
        $group = Group::where('tenant_id', $tenantId)->findOrFail($id);
        $group->update([
            'max_capacity' => $data['maxCapacity'] ?? $group->max_capacity,
            'teacher_id' => array_key_exists('teacherId', $data) ? $data['teacherId'] : $group->teacher_id,
            'room_id' => array_key_exists('roomId', $data) ? $data['roomId'] : $group->room_id,
            'monthly_price' => array_key_exists('monthlyPrice', $data) ? $data['monthlyPrice'] : $group->monthly_price,
        ]);

        return $group->load('enrollments');
    }

    /**
     * Enrollments fall back to un-grouped (still enrolled in the class),
     * matching how a class's last group behaves today. Its own scheduled
     * sessions go with it — left alive they'd be orphaned rows that
     * `SessionService::assertNoScheduleConflict()` would still see, but
     * whose `group()` relation resolves to null (soft-deleted group), so
     * it would wrongly fall back to the class's own teacher/room.
     */
    public function delete(int $id, int $tenantId): void
    {
        $group = Group::where('tenant_id', $tenantId)->findOrFail($id);
        Enrollment::where('tenant_id', $tenantId)->where('group_id', $id)->update(['group_id' => null]);
        ClassSession::where('tenant_id', $tenantId)->where('group_id', $id)->delete();
        $group->delete();
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

    /** Un-groups a student without removing them from the class — they stay enrolled, just without a group. */
    public function removeStudent(int $tenantId, int $studentId, int $groupId): void
    {
        Enrollment::where('tenant_id', $tenantId)
            ->where('student_id', $studentId)
            ->where('group_id', $groupId)
            ->update(['group_id' => null]);
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
