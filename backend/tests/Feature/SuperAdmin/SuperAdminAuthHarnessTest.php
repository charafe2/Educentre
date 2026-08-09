<?php

namespace Tests\Feature\SuperAdmin;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminAuthHarnessTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_superadmin_can_reach_a_protected_superadmin_route(): void
    {
        $superAdmin = SuperAdmin::factory()->create();

        $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/v1/superadmin/superadmins')
            ->assertOk();
    }

    public function test_a_tenant_user_is_refused(): void
    {
        $user = \App\Models\User::factory()
            ->for(\App\Models\Tenant::factory())
            ->create();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/superadmin/superadmins')
            ->assertForbidden();
    }
}
