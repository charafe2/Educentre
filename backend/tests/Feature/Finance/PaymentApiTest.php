<?php

namespace Tests\Feature\Finance;

use App\Domains\Finance\Models\Payment;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Students\Models\Student;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_tenant_can_manage_its_payments(): void
    {
        [$tenant, $user, $student, $courseClass] = $this->financeContext();

        $createResponse = $this->actingAs($user)->postJson('/api/v1/payments', [
            'studentId' => $student->id,
            'classeId' => $courseClass->id,
            'periodMonth' => '2026-06',
            'amount' => 350,
            'status' => 'pending',
            'invoiceGenerated' => false,
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.studentId', $student->id)
            ->assertJsonPath('data.status', 'pending');

        $paymentId = $createResponse->json('data.id');

        $this->actingAs($user)
            ->postJson("/api/v1/payments/{$paymentId}/mark-paid", ['method' => 'Espèces'])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.method', 'Espèces');

        $this->actingAs($user)
            ->putJson("/api/v1/payments/{$paymentId}", ['amount' => 375])
            ->assertOk()
            ->assertJsonPath('data.amount', 375);

        $this->actingAs($user)
            ->getJson('/api/v1/payments')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->actingAs($user)
            ->deleteJson("/api/v1/payments/{$paymentId}")
            ->assertOk();

        $this->assertSoftDeleted('payments', [
            'id' => $paymentId,
            'tenant_id' => $tenant->id,
        ]);
    }

    public function test_tenant_cannot_read_or_mutate_another_tenants_payment(): void
    {
        [, $user] = $this->financeContext();
        [$otherTenant, , $otherStudent, $otherClass] = $this->financeContext();

        $otherPayment = Payment::create([
            'tenant_id' => $otherTenant->id,
            'student_id' => $otherStudent->id,
            'class_id' => $otherClass->id,
            'period_month' => '2026-06-01',
            'amount' => 300,
            'status' => 'pending',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/payments')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($user)
            ->deleteJson("/api/v1/payments/{$otherPayment->id}")
            ->assertNotFound();
    }

    public function test_payments_are_number_paginated_with_tenant_summary(): void
    {
        [$tenant, $user, $student, $courseClass] = $this->financeContext();

        foreach (range(1, 7) as $index) {
            Payment::create([
                'tenant_id' => $tenant->id,
                'student_id' => $student->id,
                'class_id' => $courseClass->id,
                'period_month' => sprintf('2026-%02d-01', $index),
                'amount' => 100,
                'status' => $index <= 4 ? 'paid' : 'pending',
            ]);
        }

        $response = $this->actingAs($user)
            ->getJson('/api/v1/payments?perPage=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('summary.totalPaid', 400)
            ->assertJsonPath('summary.totalPending', 300)
            ->assertJsonPath('summary.totalCount', 7)
            ->assertJsonPath('pagination.currentPage', 1)
            ->assertJsonPath('pagination.lastPage', 2)
            ->assertJsonPath('pagination.perPage', 5)
            ->assertJsonPath('pagination.total', 7);

        $this->actingAs($user)
            ->getJson('/api/v1/payments?perPage=5&page=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('pagination.currentPage', 2);
    }

    public function test_payments_are_filtered_before_pagination(): void
    {
        [$tenant, $user, $student, $courseClass] = $this->financeContext();

        Payment::create([
            'tenant_id' => $tenant->id,
            'student_id' => $student->id,
            'class_id' => $courseClass->id,
            'period_month' => '2026-06-01',
            'amount' => 350,
            'status' => 'overdue',
        ]);
        Payment::create([
            'tenant_id' => $tenant->id,
            'student_id' => $student->id,
            'class_id' => $courseClass->id,
            'period_month' => '2026-05-01',
            'amount' => 350,
            'status' => 'paid',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/payments?perPage=5&periodMonth=2026-06&status=overdue')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'overdue')
            ->assertJsonPath('data.0.periodMonth', '2026-06');
    }

    private function financeContext(): array
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $student = Student::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'student_code' => 'ETD-'.Str::upper(Str::random(6)),
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
