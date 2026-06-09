<?php

namespace App\Domains\Teachers\Services;

use App\Domains\Teachers\Models\Teacher;
use App\Domains\Planning\Models\CourseClass;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class TeacherService
{
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
            ->with(['classes.enrollments'])
            ->get();

        return [
            'total' => $teachers->count(),
            'active' => $teachers->where('is_active', true)->count(),
            'payroll' => (float) $teachers->sum(function (Teacher $teacher) {
                if ($teacher->payment_mode === 'fixed') {
                    return (float) $teacher->fixed_monthly_salary;
                }

                $studentCount = $teacher->classes
                    ->flatMap->enrollments
                    ->pluck('student_id')
                    ->unique()
                    ->count();

                return (float) $teacher->rate_per_student * $studentCount;
            }),
        ];
    }

    public function find(int $id): Teacher
    {
        return Teacher::with(['user', 'classes'])->findOrFail($id);
    }

    public function create(array $data): Teacher
    {
        return DB::transaction(function () use ($data) {
            $user = User::create([
                'tenant_id' => $data['tenant_id'],
                'name' => trim(($data['firstName'] ?? '') . ' ' . ($data['lastName'] ?? '')),
                'email' => $data['email'] ?? null,
                'password' => 'password',
                'role' => 'teacher',
                'status' => 'active',
            ]);

            $teacher = Teacher::create([
                'tenant_id' => $data['tenant_id'],
                'user_id' => $user->id,
                'specialty' => $data['specialty'] ?? null,
                'payment_mode' => $data['paymentMode'] ?? 'fixed',
                'fixed_monthly_salary' => $data['fixedSalary'] ?? null,
                'rate_per_student' => $data['ratePerStudent'] ?? null,
                'min_students_threshold' => 0,
                'iban' => $data['iban'] ?? null,
                'is_active' => ($data['status'] ?? 'active') === 'active',
            ]);

            $this->syncClasses($teacher, $data['classIds'] ?? []);

            return $teacher->load(['user', 'classes']);
        });
    }

    public function update(int $id, array $data): Teacher
    {
        return DB::transaction(function () use ($id, $data) {
            $teacher = Teacher::with('user')->findOrFail($id);

            if ($teacher->user) {
                $teacher->user->update([
                    'name' => trim(($data['firstName'] ?? $teacher->user->name) . ' ' . ($data['lastName'] ?? '')),
                    'email' => $data['email'] ?? $teacher->user->email,
                ]);
            }

            $teacher->update([
                'specialty' => $data['specialty'] ?? $teacher->specialty,
                'payment_mode' => $data['paymentMode'] ?? $teacher->payment_mode,
                'fixed_monthly_salary' => $data['fixedSalary'] ?? $teacher->fixed_monthly_salary,
                'rate_per_student' => $data['ratePerStudent'] ?? $teacher->rate_per_student,
                'iban' => $data['iban'] ?? $teacher->iban,
                'is_active' => isset($data['status']) ? ($data['status'] === 'active') : $teacher->is_active,
            ]);

            if (array_key_exists('classIds', $data)) {
                $this->syncClasses($teacher, $data['classIds']);
            }

            return $teacher->load(['user', 'classes']);
        });
    }

    public function delete(int $id): void
    {
        $teacher = Teacher::findOrFail($id);
        $teacher->delete();
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
