<?php

namespace App\Domains\Teachers\Services;

use App\Domains\Teachers\Models\Teacher;
use App\Domains\Planning\Models\CourseClass;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeacherService
{
    /** A weekly recurring schedule is extrapolated to a month the same flat way a class's own monthly price already is — no calendar-exact week counting. */
    private const WEEKS_PER_MONTH = 4;

    public function all(?int $tenantId = null): Collection
    {
        return $this->query($tenantId)->get();
    }

    public function paginate(int $tenantId, array $filters = []): LengthAwarePaginator
    {
        return $this->query($tenantId, $filters)
            ->paginate(
                perPage: $this->perPage($filters['per_page'] ?? null),
                page: max(1, (int) ($filters['page'] ?? 1))
            );
    }

    public function summary(int $tenantId): array
    {
        $teachers = Teacher::query()
            ->where('tenant_id', $tenantId)
            ->with(['classes.enrollments', 'classes.sessions'])
            ->get();

        return [
            'total' => $teachers->count(),
            'active' => $teachers->where('is_active', true)->count(),
            'payroll' => (float) $teachers->sum(fn (Teacher $teacher) => $this->payrollAmount($teacher)),
        ];
    }

    /**
     * `fixed`: flat monthly amount, independent of enrollment.
     * `per_student`: a flat rate × how many distinct students the teacher
     * has across all of their classes (a student in two of the teacher's
     * classes still counts once).
     * `percentage`: a share of what each assigned student actually pays —
     * computed per class (rate × class.monthly_price × that class's
     * enrollment count) and summed, since a student in two classes pays
     * (and so is owed a share of) each class's price separately.
     * `per_hour`: a flat rate × the teacher's weekly scheduled hours across
     * all their classes (every non-cancelled session's own duration,
     * regardless of which group it belongs to — same class-level fidelity
     * as the other modes), extrapolated to a month at WEEKS_PER_MONTH.
     */
    private function payrollAmount(Teacher $teacher): float
    {
        if ($teacher->payment_mode === 'fixed') {
            return (float) $teacher->fixed_monthly_salary;
        }

        if ($teacher->payment_mode === 'percentage') {
            $rate = (float) $teacher->percentage_rate / 100;

            return (float) $teacher->classes->sum(
                fn (CourseClass $class) => $class->monthly_price * $class->enrollments->count() * $rate
            );
        }

        if ($teacher->payment_mode === 'per_hour') {
            return (float) $teacher->hourly_rate * $this->weeklyHours($teacher) * self::WEEKS_PER_MONTH;
        }

        $studentCount = $teacher->classes
            ->flatMap->enrollments
            ->pluck('student_id')
            ->unique()
            ->count();

        return (float) $teacher->rate_per_student * $studentCount;
    }

    private function weeklyHours(Teacher $teacher): float
    {
        return (float) $teacher->classes
            ->flatMap->sessions
            ->where('is_cancelled', false)
            ->sum(fn ($session) => $session->end_hour - $session->start_hour);
    }

    public function find(int $id, int $tenantId): Teacher
    {
        return Teacher::with(['user', 'classes'])
            ->where('tenant_id', $tenantId)
            ->findOrFail($id);
    }

    public function create(array $data): Teacher
    {
        return DB::transaction(function () use ($data) {
            $plainPassword = Str::password(12);

            $user = User::create([
                'tenant_id' => $data['tenant_id'],
                'name' => trim(($data['firstName'] ?? '') . ' ' . ($data['lastName'] ?? '')),
                'email' => $data['email'] ?? null,
                'password' => $plainPassword,
                'role' => 'teacher',
                'status' => 'active',
            ]);

            $teacher = Teacher::create([
                'tenant_id' => $data['tenant_id'],
                'user_id' => $user->id,
                'specialty' => $data['specialty'] ?? null,
                'phone' => $data['phone'] ?? null,
                'payment_mode' => $data['paymentMode'] ?? 'fixed',
                'fixed_monthly_salary' => $data['fixedSalary'] ?? null,
                'rate_per_student' => $data['ratePerStudent'] ?? null,
                'percentage_rate' => $data['percentageRate'] ?? null,
                'hourly_rate' => $data['hourlyRate'] ?? null,
                'min_students_threshold' => 0,
                'iban' => $data['iban'] ?? null,
                'is_active' => ($data['status'] ?? 'active') === 'active',
            ]);

            $this->syncClasses($teacher, $data['classIds'] ?? []);

            // Transient, one-time-only field — never persisted, never
            // re-derivable once this response is sent (see also
            // resetPassword() below, which returns the same shape).
            $teacher->plainPassword = $plainPassword;

            return $teacher->load(['user', 'classes']);
        });
    }

    public function update(int $id, int $tenantId, array $data): Teacher
    {
        return DB::transaction(function () use ($id, $tenantId, $data) {
            $teacher = Teacher::with('user')
                ->where('tenant_id', $tenantId)
                ->findOrFail($id);

            if ($teacher->user) {
                $teacher->user->update([
                    'name' => trim(($data['firstName'] ?? $teacher->user->name) . ' ' . ($data['lastName'] ?? '')),
                    'email' => $data['email'] ?? $teacher->user->email,
                ]);
            }

            $teacher->update([
                'specialty' => $data['specialty'] ?? $teacher->specialty,
                'phone' => $data['phone'] ?? $teacher->phone,
                'payment_mode' => $data['paymentMode'] ?? $teacher->payment_mode,
                'fixed_monthly_salary' => $data['fixedSalary'] ?? $teacher->fixed_monthly_salary,
                'rate_per_student' => $data['ratePerStudent'] ?? $teacher->rate_per_student,
                'percentage_rate' => $data['percentageRate'] ?? $teacher->percentage_rate,
                'hourly_rate' => $data['hourlyRate'] ?? $teacher->hourly_rate,
                'iban' => $data['iban'] ?? $teacher->iban,
                'is_active' => isset($data['status']) ? ($data['status'] === 'active') : $teacher->is_active,
            ]);

            if (array_key_exists('classIds', $data)) {
                $this->syncClasses($teacher, $data['classIds']);
            }

            return $teacher->load(['user', 'classes']);
        });
    }

    public function delete(int $id, int $tenantId): void
    {
        $teacher = Teacher::with('user')->where('tenant_id', $tenantId)->findOrFail($id);
        // Soft-deleting the Teacher row alone would leave their account able
        // to log in — cut access off the same way an explicit revoke does.
        $teacher->user->update(['status' => 'revoked']);
        $teacher->delete();
    }

    /** Generates and saves a new password, returned once in plain text. */
    public function resetPassword(int $id, int $tenantId): string
    {
        $teacher = Teacher::with('user')->where('tenant_id', $tenantId)->findOrFail($id);
        $plainPassword = Str::password(12);
        $teacher->user->update(['password' => $plainPassword]);

        return $plainPassword;
    }

    public function suspend(int $id, int $tenantId): Teacher
    {
        return $this->setAccessState($id, $tenantId, 'suspended');
    }

    public function revoke(int $id, int $tenantId): Teacher
    {
        return $this->setAccessState($id, $tenantId, 'revoked');
    }

    public function reactivate(int $id, int $tenantId): Teacher
    {
        return $this->setAccessState($id, $tenantId, 'active');
    }

    /** AuthService::login() already rejects any status other than 'active' — writing the status is the whole feature. */
    private function setAccessState(int $id, int $tenantId, string $state): Teacher
    {
        $teacher = Teacher::with(['user', 'classes'])->where('tenant_id', $tenantId)->findOrFail($id);
        $teacher->user->update(['status' => $state]);

        return $teacher;
    }

    private function syncClasses(Teacher $teacher, array $classIds): void
    {
        CourseClass::where('tenant_id', $teacher->tenant_id)
            ->where('teacher_id', $teacher->id)
            ->whereNotIn('id', $classIds)
            ->update(['teacher_id' => null]);

        if ($classIds === []) {
            return;
        }

        CourseClass::where('tenant_id', $teacher->tenant_id)
            ->whereIn('id', $classIds)
            ->update(['teacher_id' => $teacher->id]);
    }

    private function query(?int $tenantId = null, array $filters = [])
    {
        return Teacher::query()
            ->with(['user', 'classes'])
            ->when($tenantId !== null, fn ($query) => $query->where('tenant_id', $tenantId))
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('specialty', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                });
            })
            ->when($filters['status'] ?? null, function ($query, string $status) {
                $query->where('is_active', $status === 'active');
            })
            ->orderByDesc('created_at');
    }

    private function perPage(mixed $value): int
    {
        return max(1, min(50, (int) ($value ?: 8)));
    }
}
