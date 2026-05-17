<?php

namespace App\Domains\Students\Services;

use App\Domains\Students\Models\Student;
use App\Domains\Students\Models\StudentParent;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class StudentService
{
    public function all(): Collection
    {
        return Student::with(['enrollments', 'parents'])->get();
    }

    public function create(array $data): Student
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $data['tenant_id'];

            $student = Student::create([
                'tenant_id' => $tenantId,
                'student_code' => 'ETD-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                'first_name' => $data['firstName'],
                'last_name' => $data['lastName'],
                'birth_date' => $data['birthDate'] ?? null,
                'current_school' => $data['school'] ?? null,
                'school_level' => $data['level'] ?? null,
                'status' => $data['status'] ?? 'active',
                'is_active' => ($data['status'] ?? 'active') === 'active',
            ]);

            if (!empty($data['parentName']) || !empty($data['parentPhone'])) {
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

            if (!empty($data['enrolledClassIds'])) {
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
    }

    public function update(int $id, array $data): Student
    {
        return DB::transaction(function () use ($id, $data) {
            $student = Student::findOrFail($id);

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
                    if (!in_array($classId, $existing)) {
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

    public function delete(int $id): void
    {
        $student = Student::findOrFail($id);
        $student->delete();
    }
}
