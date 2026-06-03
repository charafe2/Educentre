<?php

namespace App\Domains\Planning\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SessionAttendanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sessionId' => $this->class_session_id,
            'studentId' => $this->student_id,
            'status' => $this->status,
            'notes' => $this->notes,
        ];
    }
}
