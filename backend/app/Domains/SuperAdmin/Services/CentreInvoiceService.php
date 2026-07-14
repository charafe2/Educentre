<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\Centre;
use App\Domains\SuperAdmin\Models\CentreInvoice;
use App\Domains\SuperAdmin\Models\PackagePlan;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class CentreInvoiceService
{
    public function all(array $filters = []): Collection
    {
        return CentreInvoice::query()
            ->with(['tenant.centre', 'packagePlan'])
            ->latest('issued_at')
            ->latest('id')
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['centreId'] ?? null, function ($query, mixed $centreId) {
                $query->whereHas('tenant.centre', fn ($centres) => $centres->whereKey($centreId));
            })
            ->get();
    }

    public function create(array $data): CentreInvoice
    {
        $centre = Centre::query()->findOrFail($data['centreId']);
        $packagePlan = isset($data['packagePlanId'])
            ? PackagePlan::query()->find($data['packagePlanId'])
            : null;

        $status = $data['status'];

        return CentreInvoice::create([
            'tenant_id' => $centre->tenant_id,
            'package_plan_id' => $packagePlan?->id,
            'uuid' => (string) Str::uuid(),
            'invoice_number' => $this->nextInvoiceNumber(),
            'package_name' => $data['packageName'],
            'amount' => $data['amount'],
            'issued_at' => $data['issuedAt'],
            'due_date' => $data['dueDate'],
            'paid_at' => $status === 'paid' ? ($data['paidAt'] ?? now()->toDateString()) : null,
            'status' => $status,
            'notes' => $data['notes'] ?? null,
        ])->load(['tenant.centre', 'packagePlan']);
    }

    public function markPaid(CentreInvoice $invoice): CentreInvoice
    {
        $invoice->update([
            'status' => 'paid',
            'paid_at' => now()->toDateString(),
        ]);

        return $invoice->refresh()->load(['tenant.centre', 'packagePlan']);
    }

    public function delete(CentreInvoice $invoice): void
    {
        $invoice->delete();
    }

    private function nextInvoiceNumber(): string
    {
        $prefix = 'FAC-'.now()->format('Y');
        $lastId = CentreInvoice::withTrashed()->max('id') ?? 0;

        return sprintf('%s-%04d', $prefix, $lastId + 1);
    }
}
