<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\CentreInvoice;
use App\Domains\Core\Models\PackagePlan;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class CentreInvoiceService
{
    /** Attempts to claim an invoice number before giving up on a concurrent writer. */
    private const NUMBER_ATTEMPTS = 3;

    public function __construct(private readonly InvoiceNumberGenerator $numbers) {}

    /**
     * @param  array{status?: string|null, centreId?: int|null, search?: string|null}  $filters
     * @return Collection<int, CentreInvoice>
     */
    public function list(array $filters = []): Collection
    {
        return CentreInvoice::query()
            ->with('centre:id,name,city')
            ->when(
                filled($filters['status'] ?? null),
                fn ($query) => $query->withDisplayStatus($filters['status'])
            )
            ->when(
                filled($filters['centreId'] ?? null),
                fn ($query) => $query->where('centre_id', $filters['centreId'])
            )
            ->when(
                filled($filters['search'] ?? null),
                fn ($query) => $query->where(function ($inner) use ($filters) {
                    $term = '%'.$filters['search'].'%';
                    $inner->where('invoice_number', 'like', $term)
                        ->orWhere('package_name', 'like', $term)
                        ->orWhereHas('centre', fn ($centre) => $centre->where('name', 'like', $term));
                })
            )
            // Newest first, with id as the tie-breaker so same-day invoices keep
            // a stable order across requests.
            ->orderByDesc('issued_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array{centreId: int, packagePlanId?: int|null, packageName?: string|null, amount: float|int|string, issuedAt: string, dueDate: string, status?: string|null, paidAt?: string|null, notes?: string|null}  $data
     */
    public function create(array $data): CentreInvoice
    {
        $status = $data['status'] ?? CentreInvoice::STATUS_PENDING;
        $plan = isset($data['packagePlanId'])
            ? PackagePlan::find($data['packagePlanId'])
            : null;

        $attributes = [
            'centre_id' => $data['centreId'],
            'package_plan_id' => $plan?->id,
            // Snapshot the plan name onto the invoice: the plan can be renamed
            // or deleted later, the billed line must stay what it was.
            'package_name' => $data['packageName'] ?? $plan?->name,
            'amount' => $data['amount'],
            'issued_at' => $data['issuedAt'],
            'due_date' => $data['dueDate'],
            'status' => $status,
            'paid_at' => $status === CentreInvoice::STATUS_PAID
                ? ($data['paidAt'] ?? now())
                : null,
            'notes' => $data['notes'] ?? null,
        ];

        return $this->createWithNumber($attributes, $data['issuedAt']);
    }

    public function markPaid(CentreInvoice $invoice, ?string $paidAt = null): CentreInvoice
    {
        $invoice->update([
            'status' => CentreInvoice::STATUS_PAID,
            'paid_at' => $paidAt ?? now(),
        ]);

        return $invoice->fresh(['centre']);
    }

    public function markUnpaid(CentreInvoice $invoice): CentreInvoice
    {
        $invoice->update([
            'status' => CentreInvoice::STATUS_PENDING,
            'paid_at' => null,
        ]);

        return $invoice->fresh(['centre']);
    }

    public function cancel(CentreInvoice $invoice): CentreInvoice
    {
        $invoice->update([
            'status' => CentreInvoice::STATUS_CANCELLED,
            'paid_at' => null,
        ]);

        return $invoice->fresh(['centre']);
    }

    public function delete(CentreInvoice $invoice): void
    {
        // Soft delete only. The number stays claimed — InvoiceNumberGenerator
        // scans trashed rows too, so a deleted invoice's number is never reissued.
        $invoice->delete();
    }

    /**
     * Claims a number and inserts in one transaction.
     *
     * The number is only unique because the DB says so, so a concurrent writer
     * that grabbed the same number surfaces as a unique violation — retry rather
     * than fail the request.
     */
    private function createWithNumber(array $attributes, string $issuedAt): CentreInvoice
    {
        for ($attempt = 1; ; $attempt++) {
            try {
                return DB::transaction(fn () => CentreInvoice::create([
                    'invoice_number' => $this->numbers->nextFor($issuedAt),
                    ...$attributes,
                ]));
            } catch (UniqueConstraintViolationException $e) {
                if ($attempt >= self::NUMBER_ATTEMPTS) {
                    throw $e;
                }
            }
        }
    }
}
