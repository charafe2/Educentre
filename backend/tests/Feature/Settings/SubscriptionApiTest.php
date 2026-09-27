<?php

namespace Tests\Feature\Settings;

use App\Domains\Core\Models\PackagePlan;
use App\Domains\Core\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_the_tenant_subscription_with_plan_details(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();

        PackagePlan::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Pro',
            'monthly_price' => 250,
            'users_limit' => 15,
            'students_limit' => 1000,
            'storage_gb' => 50,
            'support_level' => 'Prioritaire',
            'status' => 'active',
            'features' => ['Élèves illimités', 'Sauvegarde cloud'],
        ]);

        Subscription::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'plan' => 'Pro',
            'monthly_price' => 250,
            'start_date' => '2026-01-15',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/settings/subscription')
            ->assertOk()
            ->assertJsonPath('data.plan', 'Pro')
            ->assertJsonPath('data.monthlyPrice', 250)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.startDate', '2026-01-15')
            ->assertJsonPath('data.usersLimit', 15)
            ->assertJsonPath('data.studentsLimit', 1000)
            ->assertJsonPath('data.storageGb', 50)
            ->assertJsonPath('data.supportLevel', 'Prioritaire')
            ->assertJsonPath('data.features', ['Élèves illimités', 'Sauvegarde cloud']);
    }

    public function test_it_degrades_gracefully_when_the_catalogue_plan_is_gone(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();

        // No matching PackagePlan row — e.g. it was renamed/archived since.
        Subscription::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'plan' => 'Ancien Plan',
            'monthly_price' => 300,
            'start_date' => '2025-06-01',
            'status' => 'active',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/settings/subscription')
            ->assertOk()
            ->assertJsonPath('data.plan', 'Ancien Plan')
            ->assertJsonPath('data.usersLimit', null)
            ->assertJsonPath('data.features', []);
    }

    public function test_it_404s_when_the_tenant_has_no_subscription(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/settings/subscription')
            ->assertNotFound();
    }

    public function test_it_only_returns_the_authenticated_tenants_subscription(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();
        $userA = User::factory()->for($tenantA)->create();

        Subscription::create([
            'tenant_id' => $tenantB->id,
            'uuid' => (string) Str::uuid(),
            'plan' => 'Enterprise',
            'monthly_price' => 900,
            'start_date' => '2026-01-01',
            'status' => 'active',
        ]);

        $this->actingAs($userA)
            ->getJson('/api/v1/settings/subscription')
            ->assertNotFound();
    }
}
