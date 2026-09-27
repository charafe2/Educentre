<?php

namespace App\Domains\Finance\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category' => $this->category,
            'label' => $this->label,
            'amount' => (float) $this->amount,
            'method' => $this->method,
            'date' => $this->expense_date->format('Y-m-d'),
            'month' => $this->period_month->format('Y-m'),
            'recurring' => $this->is_recurring,
        ];
    }
}
