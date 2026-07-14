<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SuperAdminAccountResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'status' => $this->status,
            'lastLoginAt' => $this->last_login_at?->format('d/m/Y H:i'),
            'createdAt' => $this->created_at?->format('d/m/Y'),
        ];
    }
}
