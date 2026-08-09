<?php

namespace Tests\Feature\SuperAdmin;

use App\Domains\Core\Models\CentreInvoice;
use App\Domains\SuperAdmin\Services\InvoiceNumberGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceNumberGeneratorTest extends TestCase
{
    use RefreshDatabase;

    private function generator(): InvoiceNumberGenerator
    {
        return app(InvoiceNumberGenerator::class);
    }

    private function invoiceNumbered(string $number, string $issuedAt): void
    {
        CentreInvoice::create([
            'invoice_number' => $number,
            'centre_id' => null,
            'package_plan_id' => null,
            'package_name' => 'Pro',
            'amount' => 100,
            'issued_at' => $issuedAt,
            'due_date' => $issuedAt,
            'status' => 'pending',
        ]);
    }

    public function test_the_first_invoice_of_a_year_starts_at_0001(): void
    {
        $this->assertSame('FAC-2026-0001', $this->generator()->nextFor('2026-03-04'));
    }

    public function test_the_sequence_increments_within_a_year(): void
    {
        $this->invoiceNumbered('FAC-2026-0001', '2026-01-10');
        $this->invoiceNumbered('FAC-2026-0002', '2026-02-10');

        $this->assertSame('FAC-2026-0003', $this->generator()->nextFor('2026-03-04'));
    }

    public function test_the_sequence_restarts_in_a_new_year(): void
    {
        $this->invoiceNumbered('FAC-2026-0007', '2026-12-30');

        $this->assertSame('FAC-2027-0001', $this->generator()->nextFor('2027-01-02'));
    }

    public function test_a_deleted_invoice_does_not_free_its_number(): void
    {
        $this->invoiceNumbered('FAC-2026-0001', '2026-01-10');
        CentreInvoice::where('invoice_number', 'FAC-2026-0001')->delete();

        // Reusing an accounting number would be wrong even though the row is gone.
        $this->assertSame('FAC-2026-0002', $this->generator()->nextFor('2026-05-01'));
    }

    public function test_the_factory_persists_a_valid_invoice(): void
    {
        $invoice = CentreInvoice::factory()->create();

        $this->assertDatabaseHas('centre_invoices', [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
        ]);
    }
}
