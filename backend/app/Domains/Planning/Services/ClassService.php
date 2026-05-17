<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\CourseClass;
use Illuminate\Database\Eloquent\Collection;

class ClassService
{
    public function all(): Collection
    {
        return CourseClass::with(['enrollments', 'teacher.user', 'room'])->get();
    }

    public function find(int $id): CourseClass
    {
        return CourseClass::with(['enrollments', 'teacher.user', 'room'])->findOrFail($id);
    }

    public function create(array $data): CourseClass
    {
        $class = CourseClass::create([
            'tenant_id' => $data['tenant_id'],
            'teacher_id' => $data['teacherId'] ?? null,
            'room_id' => $data['roomId'] ?? null,
            'name' => $data['name'],
            'subject' => $data['subject'] ?? null,
            'level' => $data['level'] ?? null,
            'max_capacity' => $data['maxCapacity'] ?? null,
            'monthly_price' => $data['monthlyPrice'] ?? 0,
            'is_active' => ($data['status'] ?? 'active') !== 'inactive',
        ]);

        return $class->load(['enrollments', 'teacher.user', 'room']);
    }

    public function update(int $id, array $data): CourseClass
    {
        $class = CourseClass::findOrFail($id);
        $class->update([
            'teacher_id' => array_key_exists('teacherId', $data) ? $data['teacherId'] : $class->teacher_id,
            'room_id' => $data['roomId'] ?? $class->room_id,
            'name' => $data['name'] ?? $class->name,
            'subject' => $data['subject'] ?? $class->subject,
            'level' => $data['level'] ?? $class->level,
            'max_capacity' => $data['maxCapacity'] ?? $class->max_capacity,
            'monthly_price' => $data['monthlyPrice'] ?? $class->monthly_price,
            'is_active' => isset($data['status']) ? $data['status'] !== 'inactive' : $class->is_active,
        ]);

        return $class->load(['enrollments', 'teacher.user', 'room']);
    }

    public function delete(int $id): void
    {
        $class = CourseClass::findOrFail($id);
        $class->delete();
    }
}
