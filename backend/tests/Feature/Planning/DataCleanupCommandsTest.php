<?php

namespace Tests\Feature\Planning;

use App\Domains\Planning\Models\AcademicLevel;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\Group;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataCleanupCommandsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_levels_are_only_listed_without_force(): void
    {
        $tenant = Tenant::factory()->create();
        $this->level($tenant, '2ème Bac Gestion');

        $this->artisan('academic-levels:purge-seeded')->assertSuccessful();

        $this->assertSame(1, AcademicLevel::count());
    }

    public function test_seeded_levels_are_deleted_but_manual_and_really_used_ones_are_kept(): void
    {
        $tenant = Tenant::factory()->create();
        $this->level($tenant, '2ème Bac Gestion');
        $this->level($tenant, 'Tronc Commun Sciences');
        $this->level($tenant, '1ére année bac');
        $this->level($tenant, 'Tronc Commun');
        $this->makeClass($tenant, 'Démo · Maths Tronc Commun Sciences · G1', 'Tronc Commun Sciences');
        $this->makeClass($tenant, 'Maths TC', 'Tronc Commun');

        $this->artisan('academic-levels:purge-seeded', ['--force' => true])->assertSuccessful();

        $this->assertSame(['1ére année bac', 'Tronc Commun'], AcademicLevel::orderBy('name')->pluck('name')->all());
        $this->assertSame(2, $tenant->academicLevels()->count());
    }

    public function test_include_used_also_deletes_levels_used_by_real_classes(): void
    {
        $tenant = Tenant::factory()->create();
        $this->level($tenant, 'Tronc Commun');
        $this->makeClass($tenant, 'Maths TC', 'Tronc Commun');

        $this->artisan('academic-levels:purge-seeded', ['--force' => true, '--include-used' => true])->assertSuccessful();

        $this->assertSame(0, AcademicLevel::count());
    }

    public function test_duplicate_group_numbers_are_renumbered_oldest_first(): void
    {
        $tenant = Tenant::factory()->create();
        $broken = $this->makeClass($tenant, 'Maths', '2ème Bac');
        $healthy = $this->makeClass($tenant, 'SVT', '2ème Bac');
        $first = $this->group($broken, 2);
        $second = $this->group($broken, 2);
        $this->group($healthy, 1);
        $this->group($healthy, 3);

        $this->artisan('groups:renumber-duplicates')->assertSuccessful();
        $this->assertSame(2, $first->fresh()->group_number);

        $this->artisan('groups:renumber-duplicates', ['--force' => true])->assertSuccessful();

        $this->assertSame(1, $first->fresh()->group_number);
        $this->assertSame(2, $second->fresh()->group_number);
        $this->assertSame([1, 3], Group::where('class_id', $healthy->id)->orderBy('group_number')->pluck('group_number')->all());
    }

    private function level(Tenant $tenant, string $name): AcademicLevel
    {
        $level = AcademicLevel::create(['name' => $name, 'status' => 'active']);
        $tenant->academicLevels()->attach($level->id);

        return $level;
    }

    private function makeClass(Tenant $tenant, string $name, string $level): CourseClass
    {
        return CourseClass::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'name' => $name,
            'subject' => 'Mathématiques',
            'level' => $level,
            'monthly_price' => 300,
            'is_active' => true,
        ]);
    }

    private function group(CourseClass $class, int $number): Group
    {
        return Group::withoutGlobalScopes()->create([
            'tenant_id' => $class->tenant_id,
            'class_id' => $class->id,
            'group_number' => $number,
            'max_capacity' => 2,
        ]);
    }
}
