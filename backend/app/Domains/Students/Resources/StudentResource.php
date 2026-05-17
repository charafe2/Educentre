<?php

namespace App\Domains\Students\Resources;

use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $primaryParent = $this->parents->firstWhere('is_primary', true) ?? $this->parents->first();

        return [
            'id' => $this->id,
            'code' => $this->student_code,
            'firstName' => $this->first_name,
            'lastName' => $this->last_name,
            'birthDate' => $this->birth_date?->format('Y-m-d'),
            'school' => $this->current_school,
            'level' => $this->school_level,
            'enrolledClassIds' => $this->enrollments->pluck('class_id'),
            'paymentStatus' => 'paid',
            'status' => $this->is_active ? 'active' : 'inactive',
            'avatarColor' => '#0d9488',
            'parentName' => $primaryParent ? trim($primaryParent->first_name . ' ' . $primaryParent->last_name) : null,
            'parentPhone' => $primaryParent?->phone,
            'parentWhatsapp' => $primaryParent?->whatsapp_phone,
            'absenceCount' => 0,
            'totalSessions' => 0,
            'createdAt' => $this->created_at?->format('Y-m-d'),
        ];
    }
}
