<?php

namespace App\Domains\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'subject' => $this->subject,
            'level' => $this->level,
            'teacherId' => $this->teacher_id,
            'teacherName' => $this->teacher?->user?->name,
            'roomId' => $this->room_id,
            'roomName' => $this->room?->name,
            'maxCapacity' => $this->max_capacity,
            'monthlyPrice' => (float) $this->monthly_price,
            'enrolledStudentIds' => $this->enrollments->pluck('student_id'),
            'status' => $this->is_active ? 'active' : 'inactive',
        ];
    }
}
