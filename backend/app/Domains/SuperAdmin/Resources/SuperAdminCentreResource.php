<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SuperAdminCentreResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tenant = $this->tenant;
        $owner = $tenant?->users?->firstWhere('role', 'admin') ?? $tenant?->users?->first();
        $subscription = $this->subscription;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'tenantUuid' => $tenant?->uuid,
            'centreName' => $this->name,
            'centreType' => $this->type,
            'city' => $this->city,
            'ownerName' => $owner?->name,
            'email' => $owner?->email,
            'phone' => $this->phone,
            'plan' => $subscription?->plan ?? 'Basique',
            'status' => $this->statusLabel(),
            'createdAt' => $this->created_at?->format('d/m/Y'),
            'studentsCount' => $this->students_count ?? 0,
        ];
    }

    private function statusLabel(): string
    {
        if (! $this->is_active) {
            return 'suspended';
        }

        return $this->subscription?->status === 'trial' ? 'trial' : 'active';
    }
}
