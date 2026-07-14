<?php

namespace Tests\Feature\Students;

use App\Domains\Students\Models\Student;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class StudentPaginationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_students_are_number_paginated_and_tenant_scoped(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $otherTenant = Tenant::factory()->create();

        for ($index = 1; $index <= 7; $index++) {
            $this->createStudent($tenant->id, "Student {$index}", $index !== 7);
        }
        $this->createStudent($otherTenant->id, 'Other Tenant');

        $response = $this->actingAs($user)
            ->getJson('/api/v1/students?perPage=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('summary.total', 7)
            ->assertJsonPath('summary.active', 6)
            ->assertJsonPath('summary.inactive', 1)
            ->assertJsonPath('pagination.currentPage', 1)
            ->assertJsonPath('pagination.lastPage', 2)
            ->assertJsonPath('pagination.perPage', 5)
            ->assertJsonPath('pagination.total', 7);

        $this->actingAs($user)
            ->getJson('/api/v1/students?perPage=5&page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('pagination.currentPage', 2);
    }

    public function test_students_can_be_filtered_before_pagination(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $this->createStudent($tenant->id, 'Sara', true, '2ème Bac');
        $this->createStudent($tenant->id, 'Youssef', false, 'Tronc Commun');

        $this->actingAs($user)
            ->getJson('/api/v1/students?perPage=5&search=Sara&status=active&level='.urlencode('2ème Bac'))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.firstName', 'Sara');
    }

    private function createStudent(int $tenantId, string $firstName, bool $active = true, string $level = '2ème Bac'): Student
    {
        return Student::create([
            'tenant_id' => $tenantId,
            'uuid' => (string) Str::uuid(),
            'student_code' => 'ETD-'.Str::upper(Str::random(6)),
            'first_name' => $firstName,
            'last_name' => 'Test',
            'school_level' => $level,
            'is_active' => $active,
            'status' => $active ? 'active' : 'inactive',
        ]);
    }
}
