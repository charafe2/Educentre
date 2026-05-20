<?php

namespace App\Domains\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'classeId' => $this->class_id,
            'groupNumber' => $this->group_number,
            'maxCapacity' => $this->max_capacity,
            'studentIds' => $this->enrollments->pluck('student_id'),
        ];
    }
}
