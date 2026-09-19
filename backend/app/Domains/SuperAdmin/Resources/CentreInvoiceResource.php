<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CentreInvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'invoiceNumber' => $this->invoice_number,
            'centreId' => $this->centre_id,
            'centreName' => $this->centre?->name ?? '-',
            'city' => $this->centre?->city ?? '-',
            'packagePlanId' => $this->package_plan_id,
            'packageName' => $this->package_name,
            // Cast to float: the frontend sums these for the ledger totals.
            'amount' => (float) $this->amount,
            'issuedAt' => $this->issued_at?->toDateString(),
            'dueDate' => $this->due_date?->toDateString(),
            'paidAt' => $this->paid_at?->toIso8601String(),
            // Derived, so "late" reflects today's date rather than a stale column.
            'status' => $this->displayStatus(),
            'notes' => $this->notes,
        ];
    }
}
