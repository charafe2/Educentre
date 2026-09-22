<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Group;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ClassService
{
    public function all(int $tenantId): Collection
    {
        return CourseClass::query()->where('tenant_id', $tenantId)->with(['enrollments', 'teacher.user', 'room'])->get();
    }

    public function find(int $tenantId, int $id): CourseClass
    {
        return CourseClass::query()->where('tenant_id', $tenantId)->with(['enrollments', 'teacher.user', 'room'])->findOrFail($id);
    }

    public function create(array $data): CourseClass
    {
        return DB::transaction(function () use ($data) {
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

            // Every class starts with a real G1 — the frontend used to fake
            // one client-side, which vanished on the next reload.
            Group::create([
                'tenant_id' => $class->tenant_id,
                'class_id' => $class->id,
                'group_number' => 1,
                'max_capacity' => 2,
            ]);

            return $class->load(['enrollments', 'teacher.user', 'room']);
        });
    }

    public function update(int $tenantId, int $id, array $data): CourseClass
    {
        $class = CourseClass::query()->where('tenant_id', $tenantId)->findOrFail($id);
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

    public function delete(int $tenantId, int $id): void
    {
        $class = CourseClass::query()->where('tenant_id', $tenantId)->findOrFail($id);
        $class->delete();
    }
}
