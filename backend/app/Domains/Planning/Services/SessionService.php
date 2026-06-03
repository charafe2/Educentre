<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\ClassSession;
use App\Domains\Planning\Models\CourseClass;
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
        $isCancelled = (bool) ($data['isCancelled'] ?? false);

        if (!$isCancelled) {
            $this->assertNoScheduleConflict(
                tenantId: $tenantId,
                class: $class,
                day: (int) $data['day'],
                startHour: (int) $data['startHour'],
                endHour: (int) $data['endHour'],
            );
        }

        return ClassSession::create([
            'tenant_id' => $tenantId,
            'class_id' => $class->id,
            'day' => $data['day'],
            'start_hour' => $data['startHour'],
            'end_hour' => $data['endHour'],
            'is_cancelled' => $isCancelled,
            'cancel_reason' => $data['cancelReason'] ?? null,
        ])->load('class');
    }

    public function update(int $tenantId, int $id, array $data): ClassSession
    {
        $session = $this->find($tenantId, $id);
        $classId = $data['classeId'] ?? $session->class_id;
        $class = $this->findClass($tenantId, (int) $classId);
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
                class: $class,
                day: $day,
                startHour: $startHour,
                endHour: $endHour,
                ignoreSessionId: $session->id,
            );
        }

        $session->update([
            'class_id' => $class->id,
            'day' => $day,
            'start_hour' => $startHour,
            'end_hour' => $endHour,
            'is_cancelled' => $isCancelled,
            'cancel_reason' => array_key_exists('cancelReason', $data) ? $data['cancelReason'] : $session->cancel_reason,
        ]);

        return $session->refresh()->load('class');
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

    private function assertNoScheduleConflict(
        int $tenantId,
        CourseClass $class,
        int $day,
        int $startHour,
        int $endHour,
        ?int $ignoreSessionId = null,
    ): void {
        $conflict = ClassSession::query()
            ->with('class')
            ->where('tenant_id', $tenantId)
            ->where('day', $day)
            ->where('is_cancelled', false)
            ->when($ignoreSessionId !== null, fn ($query) => $query->whereKeyNot($ignoreSessionId))
            ->where('start_hour', '<', $endHour)
            ->where('end_hour', '>', $startHour)
            ->whereHas('class', function ($query) use ($class) {
                $query->where('id', $class->id)
                    ->orWhere(function ($query) use ($class) {
                        $query->whereNotNull('teacher_id')
                            ->where('teacher_id', $class->teacher_id);
                    })
                    ->orWhere(function ($query) use ($class) {
                        $query->whereNotNull('room_id')
                            ->where('room_id', $class->room_id);
                    });
            })
            ->first();

        if ($conflict === null) {
            return;
        }

        $message = 'Conflit de planning avec une autre seance.';
        if ($conflict->class_id === $class->id) {
            $message = 'Cette classe a deja une seance sur ce creneau.';
        } elseif ($conflict->class?->teacher_id === $class->teacher_id && $class->teacher_id !== null) {
            $message = 'Ce professeur a deja une seance sur ce creneau.';
        } elseif ($conflict->class?->room_id === $class->room_id && $class->room_id !== null) {
            $message = 'Cette salle est deja occupee sur ce creneau.';
        }

        throw ValidationException::withMessages([
            'startHour' => [$message],
        ]);
    }
}
