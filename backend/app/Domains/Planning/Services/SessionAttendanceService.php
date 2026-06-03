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
    public function all(int $tenantId, int $sessionId): Collection
    {
        $this->findSession($tenantId, $sessionId);

        return SessionAttendance::query()
            ->where('tenant_id', $tenantId)
            ->where('class_session_id', $sessionId)
            ->orderBy('student_id')
            ->get();
    }

    public function upsertMany(int $tenantId, int $sessionId, array $records): Collection
    {
        $session = $this->findSession($tenantId, $sessionId);

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

        DB::transaction(function () use ($tenantId, $sessionId, $records): void {
            foreach ($records as $record) {
                SessionAttendance::updateOrCreate(
                    [
                        'class_session_id' => $sessionId,
                        'student_id' => $record['studentId'],
                    ],
                    [
                        'tenant_id' => $tenantId,
                        'status' => $record['status'],
                        'notes' => $record['notes'] ?? null,
                    ]
                );
            }
        });

        return $this->all($tenantId, $sessionId);
    }

    private function findSession(int $tenantId, int $sessionId): ClassSession
    {
        return ClassSession::query()
            ->where('tenant_id', $tenantId)
            ->findOrFail($sessionId);
    }
}
