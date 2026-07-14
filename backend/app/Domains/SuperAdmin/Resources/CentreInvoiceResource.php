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
            'centreId' => $this->tenant?->centre?->id,
            'centreName' => $this->tenant?->centre?->name ?? $this->tenant?->name,
            'city' => $this->tenant?->centre?->city,
            'packagePlanId' => $this->package_plan_id,
            'packageName' => $this->package_name,
            'amount' => (float) $this->amount,
            'issuedAt' => $this->issued_at?->format('Y-m-d'),
            'dueDate' => $this->due_date?->format('Y-m-d'),
            'paidAt' => $this->paid_at?->format('Y-m-d'),
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
