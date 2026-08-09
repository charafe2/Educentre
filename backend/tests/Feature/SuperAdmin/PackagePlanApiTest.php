<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\PackagePlan;
use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PackagePlanApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): SuperAdmin
    {
        return SuperAdmin::factory()->create();
    }

    public function test_it_lists_plans_ordered_by_price(): void
    {
        PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Prioritaire', 'status' => 'active', 'features' => ['A'],
        ]);
        PackagePlan::create([
            'name' => 'Starter', 'monthly_price' => 199, 'users_limit' => 3,
            'students_limit' => 100, 'storage_gb' => 5,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/packages')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Starter')
            ->assertJsonPath('data.1.name', 'Pro');

        // Money must be a number, not a string — the frontend sums these.
        $this->assertIsFloat($response->json('data.0.monthlyPrice'));
    }

    public function test_it_creates_a_plan(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/packages', [
                'name' => 'Entreprise',
                'monthlyPrice' => 1299,
                'usersLimit' => 50,
                'studentsLimit' => 5000,
                'storageGb' => 200,
                'supportLevel' => 'Dédié',
                'status' => 'active',
                'features' => ['SLA', 'API'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Entreprise')
            ->assertJsonPath('data.features.1', 'API');

        $this->assertDatabaseHas('package_plans', ['name' => 'Entreprise']);
    }

    public function test_it_rejects_a_duplicate_name(): void
    {
        PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/packages', [
                'name' => 'Pro', 'monthlyPrice' => 100, 'usersLimit' => 1,
                'studentsLimit' => 1, 'storageGb' => 1,
                'supportLevel' => 'Standard', 'status' => 'draft', 'features' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_it_updates_and_deletes_a_plan(): void
    {
        $plan = PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->putJson("/api/v1/superadmin/packages/{$plan->id}", [
                'name' => 'Pro Plus', 'monthlyPrice' => 599, 'usersLimit' => 20,
                'studentsLimit' => 800, 'storageGb' => 50,
                'supportLevel' => 'Prioritaire', 'status' => 'active', 'features' => ['X'],
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Pro Plus');

        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/v1/superadmin/packages/{$plan->id}")
            ->assertOk();

        $this->assertSoftDeleted('package_plans', ['id' => $plan->id]);
    }
}
