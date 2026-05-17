<?php

namespace App\Domains\Teachers\Services;

use App\Domains\Teachers\Models\Teacher;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class TeacherService
{
    public function all(): Collection
    {
        return Teacher::with(['user', 'classes'])->get();
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

            return $teacher->load(['user', 'classes']);
        });
    }

    public function delete(int $id): void
    {
        $teacher = Teacher::findOrFail($id);
        $teacher->delete();
    }
}
