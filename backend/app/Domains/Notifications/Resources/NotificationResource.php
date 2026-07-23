<?php

namespace App\Domains\Notifications\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'relatedEntityType' => $this->related_entity_type,
            'relatedEntityId' => $this->related_entity_id,
            'isRead' => $this->read_at !== null,
            'createdAt' => $this->created_at,
        ];
    }
}
