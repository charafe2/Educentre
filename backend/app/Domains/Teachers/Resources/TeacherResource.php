<?php

namespace App\Domains\Teachers\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeacherResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $parts = $this->user ? explode(' ', $this->user->name, 2) : ['', ''];

        return [
            'id' => $this->id,
            'firstName' => $parts[0] ?? '',
            'lastName' => $parts[1] ?? '',
            'email' => $this->user?->email ?? '',
            'phone' => '',
            'specialty' => $this->specialty,
            'paymentMode' => $this->payment_mode,
            'fixedSalary' => (float) $this->fixed_monthly_salary,
            'ratePerStudent' => (float) $this->rate_per_student,
            'iban' => $this->iban,
            'classIds' => $this->classes->pluck('id'),
            'status' => $this->is_active ? 'active' : 'inactive',
        ];
    }
}
