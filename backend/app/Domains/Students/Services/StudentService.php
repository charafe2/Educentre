<?php

namespace App\Domains\Students\Services;

use App\Domains\Notifications\Services\NotificationService;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Models\StudentParent;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class StudentService
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function all(int $tenantId): Collection
    {
        return Student::query()
            ->where('tenant_id', $tenantId)
            ->with(['enrollments', 'parents', 'payments'])
            ->get();
    }

    public function paginate(int $tenantId, array $filters = []): LengthAwarePaginator
    {
        return $this->query($tenantId, $filters)
            ->orderByDesc('created_at')
            ->paginate(
                perPage: $this->perPage($filters['per_page'] ?? null),
                page: max(1, (int) ($filters['page'] ?? 1))
            );
    }

    public function summary(int $tenantId): array
    {
        return [
            'total' => Student::query()->where('tenant_id', $tenantId)->count(),
            'active' => Student::query()->where('tenant_id', $tenantId)->where('is_active', true)->count(),
            'inactive' => Student::query()->where('tenant_id', $tenantId)->where('is_active', false)->count(),
            'overduePayments' => Student::query()
                ->where('tenant_id', $tenantId)
                ->whereHas('payments', fn ($query) => $query->where('status', 'overdue'))
                ->count(),
        ];
    }

    public function create(array $data): Student
    {
        $student = DB::transaction(function () use ($data) {
            $tenantId = $data['tenant_id'];

            $student = Student::create([
                'tenant_id' => $tenantId,
                'student_code' => 'ETD-'.str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                'first_name' => $data['firstName'],
                'last_name' => $data['lastName'],
                'birth_date' => $data['birthDate'] ?? null,
                'current_school' => $data['school'] ?? null,
                'school_level' => $data['level'] ?? null,
                'status' => $data['status'] ?? 'active',
                'is_active' => ($data['status'] ?? 'active') === 'active',
            ]);

            if (! empty($data['parentName']) || ! empty($data['parentPhone'])) {
                $names = explode(' ', $data['parentName'] ?? '', 2);
                StudentParent::create([
                    'tenant_id' => $tenantId,
                    'student_id' => $student->id,
                    'first_name' => $names[0] ?? 'Parent',
                    'last_name' => $names[1] ?? '',
                    'phone' => $data['parentPhone'] ?? null,
                    'whatsapp_phone' => $data['parentWhatsapp'] ?? null,
                    'is_primary' => true,
                ]);
            }

            if (! empty($data['enrolledClassIds'])) {
                foreach ($data['enrolledClassIds'] as $classId) {
                    Enrollment::create([
                        'tenant_id' => $tenantId,
                        'student_id' => $student->id,
                        'class_id' => $classId,
                    ]);
                }
            }

            return $student->load(['enrollments', 'parents']);
        });

        $this->notificationService->notifyStudentRegistered($student);

        return $student;
    }

    public function update(int $tenantId, int $id, array $data): Student
    {
        return DB::transaction(function () use ($tenantId, $id, $data) {
            $student = Student::query()->where('tenant_id', $tenantId)->findOrFail($id);

            $student->update([
                'first_name' => $data['firstName'] ?? $student->first_name,
                'last_name' => $data['lastName'] ?? $student->last_name,
                'birth_date' => $data['birthDate'] ?? $student->birth_date,
                'current_school' => $data['school'] ?? $student->current_school,
                'school_level' => $data['level'] ?? $student->school_level,
                'status' => $data['status'] ?? $student->status,
                'is_active' => ($data['status'] ?? $student->status) === 'active',
            ]);

            if (isset($data['enrolledClassIds'])) {
                Enrollment::where('student_id', $id)
                    ->whereNotIn('class_id', $data['enrolledClassIds'])
                    ->delete();

                $existing = Enrollment::where('student_id', $id)->pluck('class_id')->toArray();
                foreach ($data['enrolledClassIds'] as $classId) {
                    if (! in_array($classId, $existing)) {
                        Enrollment::create([
                            'tenant_id' => $student->tenant_id,
                            'student_id' => $id,
                            'class_id' => $classId,
                        ]);
                    }
                }
            }

            return $student->load(['enrollments', 'parents']);
        });
    }

    public function delete(int $tenantId, int $id): void
    {
        $student = Student::query()->where('tenant_id', $tenantId)->findOrFail($id);
        $student->delete();
    }

    private function query(int $tenantId, array $filters)
    {
        return Student::query()
            ->where('tenant_id', $tenantId)
            ->with(['enrollments', 'parents', 'payments'])
            ->when($filters['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('student_code', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('current_school', 'like', "%{$search}%");
                });
            })
            ->when($filters['level'] ?? null, fn ($query, string $level) => $query->where('school_level', $level))
            ->when($filters['status'] ?? null, function ($query, string $status) {
                $query->where('is_active', $status === 'active');
            })
            ->when($filters['payment_status'] ?? null, function ($query, string $status) {
                if ($status === 'paid') {
                    $query->whereDoesntHave('payments', fn ($query) => $query->whereIn('status', ['pending', 'overdue']));

                    return;
                }

                $query->whereHas('payments', fn ($query) => $query->where('status', $status));
            });
    }

    private function perPage(mixed $value): int
    {
        return max(1, min(50, (int) ($value ?: 8)));
    }
}
