<?php

namespace Tests\Feature\Core;

use App\Domains\Core\Models\AuditLog;
use App\Domains\Core\Models\Centre;
use App\Domains\Finance\Models\Payment;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Students\Models\Student;
use App\Models\SuperAdmin;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_and_logout_are_audited(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create([
            'email' => 'owner@centre.ma',
            'password' => Hash::make('motdepasse123'),
            'status' => 'active',
        ]);

        $loginResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@centre.ma',
            'password' => 'motdepasse123',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Authentification',
            'action' => 'connexion',
        ]);

        // Logging in touches `last_login_at` via Eloquent update — on its own
        // this must NOT also produce a spurious "Utilisateurs" modification.
        $this->assertDatabaseMissing('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Utilisateurs',
            'action' => 'modification',
        ]);

        $token = $loginResponse->json('data.token');
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Authentification',
            'action' => 'deconnexion',
        ]);
    }

    public function test_payment_crud_is_audited(): void
    {
        [$tenant, $user, $student, $courseClass] = $this->financeContext();

        $paymentId = $this->actingAs($user)->postJson('/api/v1/payments', [
            'studentId' => $student->id,
            'classeId' => $courseClass->id,
            'periodMonth' => '2026-06',
            'amount' => 350,
            'status' => 'pending',
            'invoiceGenerated' => false,
        ])->json('data.id');

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Paiements',
            'action' => 'creation',
        ]);

        $this->actingAs($user)
            ->putJson("/api/v1/payments/{$paymentId}", ['amount' => 375])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Paiements',
            'action' => 'modification',
        ]);

        $this->actingAs($user)->deleteJson("/api/v1/payments/{$paymentId}")->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Paiements',
            'action' => 'suppression',
        ]);
    }

    public function test_group_creation_is_audited(): void
    {
        [$tenant, $user, , $courseClass] = $this->financeContext();

        $this->actingAs($user)->postJson('/api/v1/groups', [
            'classeId' => $courseClass->id,
            'groupNumber' => 1,
            'maxCapacity' => 20,
        ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Groupes',
            'action' => 'creation',
        ]);
    }

    public function test_settings_user_crud_is_audited(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->for($tenant)->create(['is_owner' => true]);

        $uuid = $this->actingAs($owner)->postJson('/api/v1/settings/users', [
            'name' => 'Fatima Zahra',
            'email' => 'fz@centre.ma',
            'permissions' => ['etudiants'],
        ])->json('data.uuid');

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Utilisateurs',
            'action' => 'creation',
        ]);

        $this->actingAs($owner)->deleteJson("/api/v1/settings/users/{$uuid}")->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Utilisateurs',
            'action' => 'suppression',
        ]);
    }

    public function test_teacher_creation_audits_both_user_and_teacher_modules(): void
    {
        $tenant = Tenant::factory()->create();
        $owner = User::factory()->for($tenant)->create();

        $this->actingAs($owner)->postJson('/api/v1/teachers', [
            'firstName' => 'Karim',
            'lastName' => 'Benali',
            'email' => 'karim@centre.ma',
            'specialty' => 'Physique',
            'paymentMode' => 'fixed',
            'fixedSalary' => 4000,
        ])->assertCreated();

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Utilisateurs',
            'action' => 'creation',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'module' => 'Professeurs',
            'action' => 'creation',
        ]);
    }

    public function test_superadmin_can_list_and_filter_audit_logs(): void
    {
        $tenant = Tenant::factory()->create();
        $centre = Centre::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Centre Al Manar',
            'type' => 'Soutien scolaire',
            'city' => 'Casablanca',
            'is_active' => true,
        ]);
        $otherTenant = Tenant::factory()->create();

        AuditLog::create([
            'tenant_id' => $tenant->id,
            'actor_id' => null,
            'actor_name' => 'Amine Tazi',
            'module' => 'Paiements',
            'action' => 'creation',
            'description' => 'Paiement de Sara Amrani — 350 MAD',
        ]);
        AuditLog::create([
            'tenant_id' => $otherTenant->id,
            'actor_id' => null,
            'actor_name' => 'Someone Else',
            'module' => 'Groupes',
            'action' => 'creation',
            'description' => 'Groupe 1',
        ]);

        $admin = SuperAdmin::factory()->create();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/audit-logs?centreId=' . $centre->id)
            ->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.centreName', $centre->name);
        $response->assertJsonPath('data.0.module', 'Paiements');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/superadmin/audit-logs?module=Groupes')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.module', 'Groupes');
    }

    public function test_non_superadmin_cannot_list_audit_logs(): void
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();

        $this->actingAs($user)
            ->getJson('/api/v1/superadmin/audit-logs')
            ->assertStatus(403);
    }

    private function financeContext(): array
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $student = Student::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'student_code' => 'ETD-' . Str::upper(Str::random(6)),
            'first_name' => 'Sara',
            'last_name' => 'Amrani',
        ]);
        $courseClass = CourseClass::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Mathématiques',
            'subject' => 'Mathématiques',
            'monthly_price' => 350,
            'is_active' => true,
        ]);

        return [$tenant, $user, $student, $courseClass];
    }
}
