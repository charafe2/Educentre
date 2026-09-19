<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\CentreInvoice;
use App\Domains\Core\Models\PackagePlan;
use App\Models\SuperAdmin;
use App\Models\Tenant;
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

    public function test_a_soft_deleted_plans_name_stays_reserved(): void
    {
        $plan = PackagePlan::create([
            'name' => 'Pro', 'monthly_price' => 499, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Standard', 'status' => 'active', 'features' => [],
        ]);
        $plan->delete();

        // The DB unique index is not scoped to deleted_at, so validation must
        // not be either — otherwise this 500s instead of returning 422.
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/packages', [
                'name' => 'Pro', 'monthlyPrice' => 100, 'usersLimit' => 1,
                'studentsLimit' => 1, 'storageGb' => 1,
                'supportLevel' => 'Standard', 'status' => 'draft', 'features' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_factory_creates_a_persisted_plan_with_overridable_status(): void
    {
        $plan = PackagePlan::factory()->create();

        $this->assertDatabaseHas('package_plans', ['id' => $plan->id]);

        $draft = PackagePlan::factory()->create(['status' => 'draft']);

        $this->assertSame('draft', $draft->status);
        $this->assertDatabaseHas('package_plans', ['id' => $draft->id, 'status' => 'draft']);
    }

    public function test_it_requires_a_superadmin(): void
    {
        $this->getJson('/api/v1/superadmin/packages')->assertUnauthorized();
    }

    public function test_it_filters_by_status_and_name(): void
    {
        PackagePlan::factory()->create(['name' => 'Starter', 'monthly_price' => 199, 'status' => 'active']);
        PackagePlan::factory()->create(['name' => 'Starter Legacy', 'monthly_price' => 99, 'status' => 'archived']);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/packages?status=active')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Starter');

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/packages?search=Legacy')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Starter Legacy');
    }

    public function test_it_rejects_an_unknown_status_filter(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/packages?status=bogus')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_it_shows_a_single_plan(): void
    {
        $plan = PackagePlan::factory()->create(['name' => 'Pro']);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson("/api/v1/superadmin/packages/{$plan->id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Pro')
            ->assertJsonPath('data.invoiceCount', 0);
    }

    public function test_it_reports_how_many_invoices_reference_a_plan(): void
    {
        $plan = PackagePlan::factory()->create();

        CentreInvoice::factory()->count(2)->create([
            'centre_id' => $this->centre()->id,
            'package_plan_id' => $plan->id,
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/packages')
            ->assertOk()
            ->assertJsonPath('data.0.invoiceCount', 2);
    }

    public function test_it_duplicates_a_plan_as_a_draft(): void
    {
        $plan = PackagePlan::factory()->create([
            'name' => 'Pro', 'status' => 'active', 'monthly_price' => 499,
            'features' => ['SLA'],
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/packages/{$plan->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.name', 'Pro copie')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.monthlyPrice', 499.0)
            ->assertJsonPath('data.features.0', 'SLA');
    }

    public function test_it_duplicates_the_same_plan_twice_without_a_name_clash(): void
    {
        $plan = PackagePlan::factory()->create(['name' => 'Pro']);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/packages/{$plan->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.name', 'Pro copie');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/packages/{$plan->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.name', 'Pro copie 2');
    }

    public function test_it_skips_a_soft_deleted_copy_name(): void
    {
        $plan = PackagePlan::factory()->create(['name' => 'Pro']);
        PackagePlan::factory()->create(['name' => 'Pro copie'])->delete();

        // "Pro copie" is trashed but its name is still reserved by the unique index.
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/packages/{$plan->id}/duplicate")
            ->assertCreated()
            ->assertJsonPath('data.name', 'Pro copie 2');
    }

    public function test_it_archives_a_plan(): void
    {
        $plan = PackagePlan::factory()->create(['status' => 'active']);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/packages/{$plan->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->assertDatabaseHas('package_plans', ['id' => $plan->id, 'status' => 'archived']);
    }

    public function test_it_refuses_to_delete_a_plan_that_has_been_billed(): void
    {
        $plan = PackagePlan::factory()->create();

        CentreInvoice::factory()->create([
            'centre_id' => $this->centre()->id,
            'package_plan_id' => $plan->id,
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/v1/superadmin/packages/{$plan->id}")
            ->assertUnprocessable();

        $this->assertNotSoftDeleted('package_plans', ['id' => $plan->id]);
    }

    public function test_it_refuses_to_delete_a_plan_whose_only_invoice_is_trashed(): void
    {
        $plan = PackagePlan::factory()->create();

        $invoice = CentreInvoice::factory()->create([
            'centre_id' => $this->centre()->id,
            'package_plan_id' => $plan->id,
        ]);
        $invoice->delete();

        // A deleted invoice is still accounting history — the plan stays.
        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/v1/superadmin/packages/{$plan->id}")
            ->assertUnprocessable();
    }

    public function test_it_rejects_an_unknown_support_level(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/packages', [
                'name' => 'Bizarre', 'monthlyPrice' => 100, 'usersLimit' => 1,
                'studentsLimit' => 1, 'storageGb' => 1,
                'supportLevel' => 'Platine', 'status' => 'draft', 'features' => [],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('supportLevel');
    }

    private function centre(): Centre
    {
        return Centre::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'name' => 'Centre Atlas',
            'city' => 'Casablanca',
            'is_active' => true,
        ]);
    }
}
