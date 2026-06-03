<?php

namespace App\Domains\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'classeId' => $this->class_id,
            'day' => $this->day,
            'startHour' => $this->start_hour,
            'endHour' => $this->end_hour,
            'isCancelled' => $this->is_cancelled,
            'cancelReason' => $this->cancel_reason,
        ];
    }
}
