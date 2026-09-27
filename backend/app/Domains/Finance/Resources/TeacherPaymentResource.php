<?php

namespace App\Domains\Finance\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherPaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'teacherId' => $this->teacher_id,
            'month' => $this->period_month->format('Y-m'),
            'amount' => (float) $this->amount,
            'method' => $this->method,
            'paidAt' => $this->paid_at?->format('Y-m-d'),
        ];
    }
}
