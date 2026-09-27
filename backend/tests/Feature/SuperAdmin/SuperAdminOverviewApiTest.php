<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\CentreInvoice;
use App\Domains\Core\Models\PackagePlan;
use App\Models\SuperAdmin;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminOverviewApiTest extends TestCase
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
        $this->getJson('/api/v1/superadmin/overview')->assertUnauthorized();
    }

    public function test_it_returns_an_empty_but_well_formed_payload(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/overview')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'invoices' => [],
                    'packageMix' => [],
                    'summary' => [
                        'totalRevenue' => 0,
                        'pendingAmount' => 0,
                        'lateAmount' => 0,
                        'paidCount' => 0,
                    ],
                ],
            ]);
    }

    public function test_it_summarises_by_display_status_treating_overdue_as_late(): void
    {
        $centre = $this->centre();
        $plan = $this->plan();

        // Paid.
        CentreInvoice::factory()->create([
            'centre_id' => $centre->id, 'package_plan_id' => $plan->id,
            'amount' => 1000, 'status' => CentreInvoice::STATUS_PAID,
            'issued_at' => '2026-01-01', 'due_date' => '2026-01-31',
        ]);

        // Pending, not yet due.
        CentreInvoice::factory()->create([
            'centre_id' => $centre->id, 'package_plan_id' => $plan->id,
            'amount' => 200, 'status' => CentreInvoice::STATUS_PENDING,
            'issued_at' => today()->toDateString(), 'due_date' => today()->addDays(10)->toDateString(),
        ]);

        // Pending with a past due date — derived as "late", never stored as such.
        CentreInvoice::factory()->create([
            'centre_id' => $centre->id, 'package_plan_id' => $plan->id,
            'amount' => 50, 'status' => CentreInvoice::STATUS_PENDING,
            'issued_at' => '2026-01-01', 'due_date' => today()->subDay()->toDateString(),
        ]);

        $summary = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/overview')
            ->assertOk()
            ->json('data.summary');

        // assertEquals, not assertSame: json_encode drops the ".0" from a whole
        // float, so these come back from the response as ints.
        $this->assertEquals(1250.0, $summary['totalRevenue']);
        $this->assertEquals(200.0, $summary['pendingAmount']);
        $this->assertEquals(50.0, $summary['lateAmount']);
        $this->assertSame(1, $summary['paidCount']);
    }

    public function test_it_excludes_cancelled_invoices(): void
    {
        $centre = $this->centre();

        CentreInvoice::factory()->create([
            'centre_id' => $centre->id, 'amount' => 900,
            'status' => CentreInvoice::STATUS_CANCELLED,
            'issued_at' => '2026-01-01', 'due_date' => '2026-02-01',
        ]);

        $data = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/overview')
            ->assertOk()
            ->json('data');

        $this->assertSame([], $data['invoices']);
        $this->assertEquals(0.0, $data['summary']['totalRevenue']);
    }

    public function test_package_mix_lists_unsold_plans_with_zeroes(): void
    {
        $this->plan('Basique', 199);

        $mix = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/overview')
            ->assertOk()
            ->json('data.packageMix');

        $this->assertCount(1, $mix);
        $this->assertSame('Basique', $mix[0]['name']);
        $this->assertSame(0, $mix[0]['centres']);
        $this->assertEquals(0.0, $mix[0]['revenue']);
    }

    public function test_invoice_rows_carry_centre_details_and_a_display_date(): void
    {
        $centre = $this->centre('Centre Rabat', 'Rabat');
        $plan = $this->plan();

        CentreInvoice::factory()->create([
            'centre_id' => $centre->id, 'package_plan_id' => $plan->id,
            'package_name' => 'Pro', 'amount' => 499,
            'status' => CentreInvoice::STATUS_PAID,
            'issued_at' => '2026-03-01', 'due_date' => '2026-03-31',
        ]);

        $row = $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/v1/superadmin/overview')
            ->assertOk()
            ->json('data.invoices.0');

        $this->assertSame('Centre Rabat', $row['centre']);
        $this->assertSame('Rabat', $row['city']);
        $this->assertSame('Pro', $row['packageName']);
        $this->assertEquals(499.0, $row['amount']);
        // Rendered verbatim by the console, so the format is part of the contract.
        $this->assertSame('31/03/2026', $row['dueDate']);
        $this->assertSame('paid', $row['status']);
    }
}
