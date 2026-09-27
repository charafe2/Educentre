<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\ClassSession;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Group;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class SessionService
{
    public function all(int $tenantId, array $filters = []): Collection
    {
        return ClassSession::query()
            ->with('class')
            ->where('tenant_id', $tenantId)
            ->when(array_key_exists('day', $filters), fn ($query) => $query->where('day', $filters['day']))
            ->when(array_key_exists('classeId', $filters), fn ($query) => $query->where('class_id', $filters['classeId']))
            ->when(array_key_exists('isCancelled', $filters), fn ($query) => $query->where('is_cancelled', $filters['isCancelled']))
            ->orderBy('day')
            ->orderBy('start_hour')
            ->get();
    }

    public function today(int $tenantId, int $day): Collection
    {
        return $this->all($tenantId, [
            'day' => $day,
            'isCancelled' => false,
        ]);
    }

    public function find(int $tenantId, int $id): ClassSession
    {
        return ClassSession::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);
    }

    public function create(int $tenantId, array $data): ClassSession
    {
        $class = $this->findClass($tenantId, $data['classeId']);
        $group = $this->findGroup($tenantId, $data['groupId'] ?? null);
        $isCancelled = (bool) ($data['isCancelled'] ?? false);

        if (!$isCancelled) {
            $this->assertNoScheduleConflict(
                tenantId: $tenantId,
                classId: $class->id,
                groupId: $group?->id,
                teacherId: $group?->effectiveTeacherId() ?? $class->teacher_id,
                roomId: $group?->effectiveRoomId() ?? $class->room_id,
                day: (int) $data['day'],
                startHour: (int) $data['startHour'],
                endHour: (int) $data['endHour'],
            );
        }

        return ClassSession::create([
            'tenant_id' => $tenantId,
            'class_id' => $class->id,
            'group_id' => $group?->id,
            'day' => $data['day'],
            'start_hour' => $data['startHour'],
            'end_hour' => $data['endHour'],
            'is_cancelled' => $isCancelled,
            'cancel_reason' => $data['cancelReason'] ?? null,
        ])->load('class', 'group');
    }

    public function update(int $tenantId, int $id, array $data): ClassSession
    {
        $session = $this->find($tenantId, $id);
        $classId = $data['classeId'] ?? $session->class_id;
        $class = $this->findClass($tenantId, (int) $classId);
        $groupId = array_key_exists('groupId', $data) ? $data['groupId'] : $session->group_id;
        $group = $this->findGroup($tenantId, $groupId);
        $day = (int) ($data['day'] ?? $session->day);
        $startHour = (int) ($data['startHour'] ?? $session->start_hour);
        $endHour = (int) ($data['endHour'] ?? $session->end_hour);
        $isCancelled = (bool) ($data['isCancelled'] ?? $session->is_cancelled);

        if ($endHour <= $startHour) {
            throw ValidationException::withMessages([
                'endHour' => ['L heure de fin doit etre apres l heure de debut.'],
            ]);
        }

        if (!$isCancelled) {
            $this->assertNoScheduleConflict(
                tenantId: $tenantId,
                classId: $class->id,
                groupId: $group?->id,
                teacherId: $group?->effectiveTeacherId() ?? $class->teacher_id,
                roomId: $group?->effectiveRoomId() ?? $class->room_id,
                day: $day,
                startHour: $startHour,
                endHour: $endHour,
                ignoreSessionId: $session->id,
            );
        }

        $session->update([
            'class_id' => $class->id,
            'group_id' => $group?->id,
            'day' => $day,
            'start_hour' => $startHour,
            'end_hour' => $endHour,
            'is_cancelled' => $isCancelled,
            'cancel_reason' => array_key_exists('cancelReason', $data) ? $data['cancelReason'] : $session->cancel_reason,
        ]);

        return $session->refresh()->load('class', 'group');
    }

    public function cancel(int $tenantId, int $id, string $reason): ClassSession
    {
        $session = $this->find($tenantId, $id);
        $session->update([
            'is_cancelled' => true,
            'cancel_reason' => $reason,
        ]);

        return $session->refresh()->load('class');
    }

    public function delete(int $tenantId, int $id): void
    {
        $this->find($tenantId, $id)->delete();
    }

    private function findClass(int $tenantId, int $classId): CourseClass
    {
        return CourseClass::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($classId);
    }

    private function findGroup(int $tenantId, ?int $groupId): ?Group
    {
        if ($groupId === null) {
            return null;
        }

        return Group::query()
            ->with('courseClass')
            ->where('tenant_id', $tenantId)
            ->findOrFail($groupId);
    }

    /**
     * A conflict is: the exact same class+group slot (double-booking it), or
     * another session whose EFFECTIVE teacher/room — its own group's
     * override if it has one, else its class's — matches this one's. Groups
     * can override their class's teacher/room/price (see Group model), so
     * the comparison can't be done as a single whereHas('class', ...) query
     * the way it could when only classes carried a teacher/room.
     */
    private function assertNoScheduleConflict(
        int $tenantId,
        int $classId,
        ?int $groupId,
        ?int $teacherId,
        ?int $roomId,
        int $day,
        int $startHour,
        int $endHour,
        ?int $ignoreSessionId = null,
    ): void {
        $overlapping = ClassSession::query()
            ->with(['class', 'group.courseClass'])
            ->where('tenant_id', $tenantId)
            ->where('day', $day)
            ->where('is_cancelled', false)
            ->when($ignoreSessionId !== null, fn ($query) => $query->whereKeyNot($ignoreSessionId))
            ->where('start_hour', '<', $endHour)
            ->where('end_hour', '>', $startHour)
            ->get();

        foreach ($overlapping as $session) {
            $sameSlot = $session->class_id === $classId && $session->group_id === $groupId;
            $sessionTeacherId = $session->group?->effectiveTeacherId() ?? $session->class?->teacher_id;
            $sessionRoomId = $session->group?->effectiveRoomId() ?? $session->class?->room_id;
            $teacherClash = $teacherId !== null && $sessionTeacherId === $teacherId;
            $roomClash = $roomId !== null && $sessionRoomId === $roomId;

            if (!$sameSlot && !$teacherClash && !$roomClash) {
                continue;
            }

            $message = match (true) {
                $sameSlot => 'Ce groupe a deja une seance sur ce creneau.',
                $teacherClash => 'Ce professeur a deja une seance sur ce creneau.',
                default => 'Cette salle est deja occupee sur ce creneau.',
            };

            throw ValidationException::withMessages(['startHour' => [$message]]);
        }
    }
}
