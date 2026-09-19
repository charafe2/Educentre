<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'centreId' => $this->tenant?->centre?->id,
            'centreName' => $this->tenant?->centre?->name ?? $this->tenant?->name ?? '—',
            'module' => $this->module,
            'action' => $this->action,
            'description' => $this->description,
            'actorName' => $this->actor_name,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
