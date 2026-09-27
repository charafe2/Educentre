<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Planning\Models\AcademicLevel;
use App\Domains\Planning\Models\Subject;
use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Every uuid column is NOT NULL with no database default. A model that lists
 * 'uuid' as fillable but never sets it fails the insert, surfacing as a 500 —
 * which is exactly what POST /subjects and POST /academic-levels did.
 */
class ModelUuidGenerationTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): SuperAdmin
    {
        return SuperAdmin::factory()->create();
    }

    public function test_creating_a_subject_via_the_api_no_longer_500s(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/subjects', [
                'name' => 'Mathématiques',
                'color' => '#1d4ed8',
                'bgColor' => '#dbeafe',
                'status' => 'active',
            ])
            ->assertCreated();

        $subject = Subject::where('name', 'Mathématiques')->firstOrFail();
        $this->assertNotEmpty($subject->uuid);
    }

    public function test_creating_an_academic_level_via_the_api_no_longer_500s(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/academic-levels', ['name' => '2ème Bac Sciences'])
            ->assertCreated();

        $level = AcademicLevel::where('name', '2ème Bac Sciences')->firstOrFail();
        $this->assertNotEmpty($level->uuid);
    }

    public function test_the_trait_generates_a_uuid_when_none_is_supplied(): void
    {
        $subject = Subject::create(['name' => 'Physique-Chimie']);

        $this->assertNotEmpty($subject->uuid);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $subject->uuid,
        );
    }

    public function test_an_explicitly_supplied_uuid_is_preserved(): void
    {
        $uuid = '11111111-2222-4333-8444-555555555555';

        $subject = Subject::create(['uuid' => $uuid, 'name' => 'SVT']);

        $this->assertSame($uuid, $subject->fresh()->uuid);
    }
}
