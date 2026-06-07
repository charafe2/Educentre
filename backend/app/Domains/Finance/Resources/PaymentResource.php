<?php

namespace App\Domains\Finance\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'studentId' => $this->student_id,
            'classeId' => $this->class_id,
            'periodMonth' => $this->period_month->format('Y-m'),
            'amount' => (float) $this->amount,
            'status' => $this->status,
            'method' => $this->method,
            'paidAt' => $this->paid_at?->format('Y-m-d'),
            'note' => $this->note,
            'invoiceGenerated' => $this->invoice_generated,
        ];
    }
}
