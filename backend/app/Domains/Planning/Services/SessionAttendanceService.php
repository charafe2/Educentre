<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\ClassSession;
use App\Domains\Planning\Models\SessionAttendance;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SessionAttendanceService
{
    public function all(int $tenantId, int $sessionId, ?string $attendedOn = null): Collection
    {
        $this->findSession($tenantId, $sessionId);

        return SessionAttendance::query()
            ->where('tenant_id', $tenantId)
            ->where('class_session_id', $sessionId)
            ->when($attendedOn !== null, fn ($query) => $query->whereDate('attended_on', $attendedOn))
            ->orderBy('student_id')
            ->get();
    }

    public function upsertMany(int $tenantId, int $sessionId, array $records, ?string $attendedOn = null): Collection
    {
        $session = $this->findSession($tenantId, $sessionId);
        $attendedOn ??= now()->toDateString();

        if ($session->is_cancelled) {
            throw ValidationException::withMessages([
                'session' => ['Impossible de saisir les presences pour une seance annulee.'],
            ]);
        }

        $studentIds = collect($records)->pluck('studentId')->unique()->values();
        $enrolledIds = Enrollment::query()
            ->where('tenant_id', $tenantId)
            ->where('class_id', $session->class_id)
            ->where('status', 'active')
            ->whereIn('student_id', $studentIds)
            ->pluck('student_id');

        $invalidIds = $studentIds->diff($enrolledIds)->values();
        if ($invalidIds->isNotEmpty()) {
            throw ValidationException::withMessages([
                'records' => ['Certains eleves ne sont pas inscrits dans cette classe.'],
            ]);
        }

        DB::transaction(function () use ($tenantId, $sessionId, $attendedOn, $records): void {
            foreach ($records as $record) {
                SessionAttendance::updateOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'class_session_id' => $sessionId,
                        'student_id' => $record['studentId'],
                        'attended_on' => $attendedOn,
                    ],
                    [
                        'status' => $record['status'],
                        'notes' => $record['notes'] ?? null,
                    ]
                );
            }
        });

        return $this->all($tenantId, $sessionId, $attendedOn);
    }

    private function findSession(int $tenantId, int $sessionId): ClassSession
    {
        return ClassSession::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($sessionId);
    }
}
