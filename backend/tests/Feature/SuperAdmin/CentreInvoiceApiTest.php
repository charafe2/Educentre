<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\CentreInvoice;
use App\Domains\Core\Models\PackagePlan;
use App\Models\SuperAdmin;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CentreInvoiceApiTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): SuperAdmin
    {
        return SuperAdmin::factory()->create();
    }

    private function centre(string $name = 'Centre Atlas', string $city = 'Casablanca'): Centre
    {
        return Centre::create([
            'tenant_id' => Tenant::factory()->create()->id,
            'name' => $name,
            'city' => $city,
            'is_active' => true,
        ]);
    }

    private function plan(string $name = 'Pro', float $price = 499): PackagePlan
    {
        return PackagePlan::create([
            'name' => $name, 'monthly_price' => $price, 'users_limit' => 10,
            'students_limit' => 500, 'storage_gb' => 20,
            'support_level' => 'Prioritaire', 'status' => 'active', 'features' => [],
        ]);
    }

    public function test_it_requires_a_superadmin(): void
    {
        $this->getJson('/api/v1/superadmin/invoices')->assertUnauthorized();
    }

    public function test_it_lists_invoices_newest_first_with_centre_details(): void
    {
        $centre = $this->centre();

        CentreInvoice::factory()->create([
            'centre_id' => $centre->id,
            'issued_at' => '2026-01-10',
            'due_date' => '2026-02-10',
            'amount' => 499,
        ]);
        CentreInvoice::factory()->create([
            'centre_id' => $centre->id,
            'issued_at' => '2026-03-01',
            'due_date' => '2026-04-01',
            'amount' => 250,
        ]);

        $response = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.issuedAt', '2026-03-01')
            ->assertJsonPath('data.1.issuedAt', '2026-01-10')
            ->assertJsonPath('data.0.centreName', 'Centre Atlas')
            ->assertJsonPath('data.0.city', 'Casablanca');

        // Money must be a number, not a string — the frontend sums these.
        $this->assertIsFloat($response->json('data.0.amount'));
    }

    public function test_it_reports_a_past_due_pending_invoice_as_late(): void
    {
        $centre = $this->centre();

        CentreInvoice::factory()->create([
            'centre_id' => $centre->id,
            'issued_at' => today()->subMonth(),
            'due_date' => today()->subDay(),
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'late');
    }

    public function test_it_does_not_report_a_paid_past_due_invoice_as_late(): void
    {
        $centre = $this->centre();

        CentreInvoice::factory()->create([
            'centre_id' => $centre->id,
            'due_date' => today()->subDay(),
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'paid');
    }

    public function test_it_filters_by_derived_late_status(): void
    {
        $centre = $this->centre();

        CentreInvoice::factory()->create([
            'centre_id' => $centre->id,
            'due_date' => today()->subDay(),
            'status' => 'pending',
            'invoice_number' => 'FAC-2026-9001',
        ]);
        CentreInvoice::factory()->create([
            'centre_id' => $centre->id,
            'due_date' => today()->addDays(10),
            'status' => 'pending',
            'invoice_number' => 'FAC-2026-9002',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices?status=late')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.invoiceNumber', 'FAC-2026-9001');

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/invoices?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.invoiceNumber', 'FAC-2026-9002');
    }

    public function test_it_creates_an_invoice_with_a_generated_number(): void
    {
        $centre = $this->centre();
        $plan = $this->plan();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packagePlanId' => $plan->id,
                'packageName' => 'Pro',
                'amount' => 499,
                'issuedAt' => '2026-08-09',
                'dueDate' => '2026-09-09',
                'status' => 'pending',
                'notes' => 'Facturation août',
            ])
            ->assertCreated()
            ->assertJsonPath('data.invoiceNumber', 'FAC-2026-0001')
            ->assertJsonPath('data.centreName', 'Centre Atlas')
            ->assertJsonPath('data.packageName', 'Pro')
            ->assertJsonPath('data.amount', 499.0)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.paidAt', null);

        $this->assertDatabaseHas('centre_invoices', [
            'invoice_number' => 'FAC-2026-0001',
            'centre_id' => $centre->id,
            'package_plan_id' => $plan->id,
        ]);
    }

    public function test_it_snapshots_the_plan_name_when_none_is_given(): void
    {
        $centre = $this->centre();
        $plan = $this->plan('Entreprise', 1299);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packagePlanId' => $plan->id,
                'amount' => 1299,
                'issuedAt' => '2026-08-09',
                'dueDate' => '2026-09-09',
            ])
            ->assertCreated()
            ->assertJsonPath('data.packageName', 'Entreprise');
    }

    public function test_it_numbers_invoices_sequentially_per_year(): void
    {
        $centre = $this->centre();

        foreach (['2026-01-05', '2026-06-05', '2027-01-05'] as $issuedAt) {
            $this->actingAs($this->admin(), 'sanctum')
                ->postJson('/api/v1/superadmin/invoices', [
                    'centreId' => $centre->id,
                    'packageName' => 'Pro',
                    'amount' => 499,
                    'issuedAt' => $issuedAt,
                    'dueDate' => $issuedAt,
                ])
                ->assertCreated();
        }

        $this->assertSame(
            ['FAC-2026-0001', 'FAC-2026-0002', 'FAC-2027-0001'],
            CentreInvoice::orderBy('id')->pluck('invoice_number')->all(),
        );
    }

    public function test_it_rejects_an_invalid_payload(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => 9999,
                'amount' => 0,
                'issuedAt' => '2026-08-09',
                'dueDate' => '2026-08-01',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['centreId', 'packageName', 'amount', 'dueDate']);
    }

    public function test_it_normalises_a_late_status_on_create(): void
    {
        $centre = $this->centre();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packageName' => 'Pro',
                'amount' => 499,
                'issuedAt' => today()->subMonth()->toDateString(),
                'dueDate' => today()->subDay()->toDateString(),
                'status' => 'late',
            ])
            ->assertCreated()
            // Stored as pending, reported as late because the due date passed.
            ->assertJsonPath('data.status', 'late');

        $this->assertDatabaseHas('centre_invoices', ['status' => 'pending']);
    }

    public function test_it_marks_an_invoice_paid(): void
    {
        $invoice = CentreInvoice::factory()->create([
            'centre_id' => $this->centre()->id,
            'status' => 'pending',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/invoices/{$invoice->id}/mark-paid")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        $this->assertNotNull($invoice->fresh()->paid_at);
    }

    public function test_it_refuses_to_mark_a_cancelled_invoice_paid(): void
    {
        $invoice = CentreInvoice::factory()->create([
            'centre_id' => $this->centre()->id,
            'status' => 'cancelled',
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/invoices/{$invoice->id}/mark-paid")
            ->assertStatus(422);

        $this->assertSame('cancelled', $invoice->fresh()->status);
    }

    public function test_it_marks_an_invoice_unpaid(): void
    {
        $invoice = CentreInvoice::factory()->create([
            'centre_id' => $this->centre()->id,
            'status' => 'paid',
            'paid_at' => now(),
            'due_date' => today()->addDays(5),
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/invoices/{$invoice->id}/mark-unpaid")
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.paidAt', null);
    }

    public function test_it_cancels_a_pending_invoice_but_not_a_paid_one(): void
    {
        $centre = $this->centre();

        $pending = CentreInvoice::factory()->create(['centre_id' => $centre->id, 'status' => 'pending']);
        $paid = CentreInvoice::factory()->create(['centre_id' => $centre->id, 'status' => 'paid', 'paid_at' => now()]);

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/invoices/{$pending->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson("/api/v1/superadmin/invoices/{$paid->id}/cancel")
            ->assertStatus(422);
    }

    public function test_it_soft_deletes_an_invoice_and_keeps_its_number_reserved(): void
    {
        $centre = $this->centre();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packageName' => 'Pro',
                'amount' => 499,
                'issuedAt' => '2026-08-09',
                'dueDate' => '2026-09-09',
            ])
            ->assertCreated();

        $first = CentreInvoice::firstOrFail();

        $this->actingAs($this->admin(), 'sanctum')
            ->deleteJson("/api/v1/superadmin/invoices/{$first->id}")
            ->assertOk();

        $this->assertSoftDeleted('centre_invoices', ['id' => $first->id]);

        // The next invoice must not reuse the deleted one's number.
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/v1/superadmin/invoices', [
                'centreId' => $centre->id,
                'packageName' => 'Pro',
                'amount' => 499,
                'issuedAt' => '2026-08-09',
                'dueDate' => '2026-09-09',
            ])
            ->assertCreated()
            ->assertJsonPath('data.invoiceNumber', 'FAC-2026-0002');
    }
}
