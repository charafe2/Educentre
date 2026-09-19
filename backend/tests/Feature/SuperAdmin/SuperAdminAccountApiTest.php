<?php

namespace Tests\Feature\SuperAdmin;

use App\Models\SuperAdmin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminAccountApiTest extends TestCase
{
    use RefreshDatabase;

    private const VALID_PASSWORD = 'correct-horse-42';

    public function test_it_requires_a_superadmin(): void
    {
        $this->getJson('/api/v1/superadmin/accounts')->assertUnauthorized();
    }

    public function test_it_lists_accounts_with_console_fields(): void
    {
        $admin = SuperAdmin::factory()->create(['name' => 'Amine', 'email' => 'amine@example.com']);
        SuperAdmin::factory()->suspended()->create(['name' => 'Zineb']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/accounts')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Amine')
            ->assertJsonPath('data.0.status', 'active')
            ->assertJsonPath('data.0.isSelf', true)
            ->assertJsonPath('data.1.name', 'Zineb')
            ->assertJsonPath('data.1.status', 'suspended')
            ->assertJsonPath('data.1.isSelf', false)
            // The password hash must never reach the console.
            ->assertJsonMissingPath('data.0.password');
    }

    public function test_it_filters_by_status_and_search(): void
    {
        $admin = SuperAdmin::factory()->create(['name' => 'Amine', 'email' => 'amine@example.com']);
        SuperAdmin::factory()->suspended()->create(['name' => 'Zineb', 'email' => 'zineb@example.com']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/accounts?status=suspended')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Zineb');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/accounts?search=amine@')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Amine');
    }

    public function test_it_creates_an_account_with_a_hashed_password(): void
    {
        $admin = SuperAdmin::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/superadmin/accounts', [
                'name' => 'Nadia',
                'email' => 'nadia@example.com',
                'password' => self::VALID_PASSWORD,
                'status' => 'active',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Nadia')
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.lastLoginAt', null);

        $created = SuperAdmin::where('email', 'nadia@example.com')->firstOrFail();

        $this->assertNotSame(self::VALID_PASSWORD, $created->password);
        $this->assertTrue(Hash::check(self::VALID_PASSWORD, $created->password));
    }

    public function test_it_rejects_a_duplicate_email_and_a_weak_password(): void
    {
        $admin = SuperAdmin::factory()->create(['email' => 'taken@example.com']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/superadmin/accounts', [
                'name' => 'Nadia',
                'email' => 'taken@example.com',
                'password' => 'short',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_it_keeps_the_existing_password_when_none_is_sent(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create([
            'name' => 'Nadia',
            'email' => 'nadia@example.com',
            'password' => Hash::make(self::VALID_PASSWORD),
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/superadmin/accounts/{$target->id}", [
                'name' => 'Nadia B.',
                'email' => 'nadia@example.com',
                // The console sends an empty password when it isn't being changed.
                'password' => '',
                'status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Nadia B.');

        $this->assertTrue(Hash::check(self::VALID_PASSWORD, $target->fresh()->password));
    }

    public function test_it_changes_the_password_when_one_is_sent(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create(['email' => 'nadia@example.com']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/superadmin/accounts/{$target->id}", [
                'name' => 'Nadia',
                'email' => 'nadia@example.com',
                'password' => 'brand-new-secret-9',
                'status' => 'active',
            ])
            ->assertOk();

        $this->assertTrue(Hash::check('brand-new-secret-9', $target->fresh()->password));
    }

    public function test_it_toggles_status(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/superadmin/accounts/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/superadmin/accounts/{$target->id}/toggle-status")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_suspending_an_account_revokes_its_tokens(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create();
        $target->createToken('superadmin-auth-token');

        $this->assertSame(1, $target->tokens()->count());

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/superadmin/accounts/{$target->id}/toggle-status")
            ->assertOk();

        $this->assertSame(0, $target->tokens()->count());
    }

    public function test_a_suspended_account_cannot_log_in(): void
    {
        SuperAdmin::factory()->suspended()->create([
            'email' => 'zineb@example.com',
            'password' => Hash::make(self::VALID_PASSWORD),
        ]);

        $this->postJson('/api/v1/superadmin/auth/login', [
            'email' => 'zineb@example.com',
            'password' => self::VALID_PASSWORD,
        ])->assertStatus(401);
    }

    public function test_a_suspended_account_is_rejected_even_holding_a_token(): void
    {
        $suspended = SuperAdmin::factory()->suspended()->create();

        $this->actingAs($suspended, 'sanctum')
            ->getJson('/api/v1/superadmin/accounts')
            ->assertForbidden();
    }

    public function test_logging_in_records_the_last_login(): void
    {
        $admin = SuperAdmin::factory()->create([
            'email' => 'amine@example.com',
            'password' => Hash::make(self::VALID_PASSWORD),
        ]);

        $this->assertNull($admin->last_login_at);

        $this->postJson('/api/v1/superadmin/auth/login', [
            'email' => 'amine@example.com',
            'password' => self::VALID_PASSWORD,
        ])->assertOk();

        $this->assertNotNull($admin->fresh()->last_login_at);
    }

    public function test_it_refuses_to_suspend_or_delete_your_own_account(): void
    {
        $admin = SuperAdmin::factory()->create();
        SuperAdmin::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/superadmin/accounts/{$admin->id}/toggle-status")
            ->assertUnprocessable();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/superadmin/accounts/{$admin->id}")
            ->assertUnprocessable();

        $this->assertTrue($admin->fresh()->is_active);
        $this->assertNotSoftDeleted('super_admins', ['id' => $admin->id]);
    }

    public function test_it_refuses_to_suspend_your_own_account_via_update(): void
    {
        $admin = SuperAdmin::factory()->create();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/superadmin/accounts/{$admin->id}", [
                'name' => $admin->name,
                'email' => $admin->email,
                'status' => 'suspended',
            ])
            ->assertUnprocessable();

        $this->assertTrue($admin->fresh()->is_active);
    }

    public function test_it_still_allows_editing_your_own_details(): void
    {
        $admin = SuperAdmin::factory()->create(['email' => 'amine@example.com']);

        // The self-guard covers suspension only — renaming yourself is fine.
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/v1/superadmin/accounts/{$admin->id}", [
                'name' => 'Amine T.',
                'email' => 'amine@example.com',
                'status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Amine T.');
    }

    public function test_it_soft_deletes_an_account_and_revokes_its_tokens(): void
    {
        $admin = SuperAdmin::factory()->create();
        $target = SuperAdmin::factory()->create();
        $target->createToken('superadmin-auth-token');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/superadmin/accounts/{$target->id}")
            ->assertOk();

        $this->assertSoftDeleted('super_admins', ['id' => $target->id]);
        $this->assertSame(0, $target->tokens()->count());

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/accounts')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_the_assignable_operator_list_exposes_ids_and_hides_suspended(): void
    {
        $admin = SuperAdmin::factory()->create(['name' => 'Amine']);
        SuperAdmin::factory()->suspended()->create(['name' => 'Zineb']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/superadmins')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $admin->id)
            ->assertJsonPath('data.0.name', 'Amine');
    }
}
