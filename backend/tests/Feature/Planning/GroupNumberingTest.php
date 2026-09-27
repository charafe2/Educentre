<?php

namespace Tests\Feature\Planning;

use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Group;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GroupNumberingTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_class_persists_its_first_group(): void
    {
        $user = User::factory()->for(Tenant::factory())->create();

        $classId = $this->actingAs($user)
            ->postJson('/api/v1/classes', ['name' => 'Maths 2Bac', 'subject' => 'Mathématiques', 'level' => '2ème Bac'])
            ->assertCreated()
            ->json('data.id');

        $this->assertSame([1], $this->groupNumbers($classId));
    }

    public function test_each_new_group_gets_the_next_number(): void
    {
        $user = User::factory()->for(Tenant::factory())->create();
        $classId = $this->actingAs($user)
            ->postJson('/api/v1/classes', ['name' => 'Maths 2Bac', 'subject' => 'Mathématiques', 'level' => '2ème Bac'])
            ->json('data.id');

        foreach (range(1, 3) as $ignored) {
            $this->actingAs($user)
                ->postJson('/api/v1/groups', ['classeId' => $classId, 'maxCapacity' => 2, 'studentIds' => []])
                ->assertCreated();
        }

        $this->assertSame([1, 2, 3, 4], $this->groupNumbers($classId));
    }

    public function test_a_stale_group_number_from_the_client_cannot_create_a_duplicate(): void
    {
        $user = User::factory()->for(Tenant::factory())->create();
        $classId = $this->actingAs($user)
            ->postJson('/api/v1/classes', ['name' => 'Maths 2Bac', 'subject' => 'Mathématiques', 'level' => '2ème Bac'])
            ->json('data.id');

        foreach (range(1, 2) as $ignored) {
            $this->actingAs($user)
                ->postJson('/api/v1/groups', ['classeId' => $classId, 'groupNumber' => 2, 'studentIds' => []])
                ->assertCreated();
        }

        $this->assertSame([1, 2, 3], $this->groupNumbers($classId));
    }

    private function groupNumbers(int $classId): array
    {
        return Group::query()
            ->where('class_id', $classId)
            ->orderBy('group_number')
            ->pluck('group_number')
            ->all();
    }
}
