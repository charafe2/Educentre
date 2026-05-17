<?php

namespace App\Domains\Auth\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use OpenApi\Attributes as OA;

#[OA\Schema(
    schema: 'User',
    properties: [
        new OA\Property(property: 'uuid', type: 'string', format: 'uuid', example: 'af4ec842-1d54-4397-8514-e2e4fb89510b'),
        new OA\Property(property: 'name', type: 'string', example: 'Ahmed Berrada'),
        new OA\Property(property: 'email', type: 'string', format: 'email', example: 'admin@moujtahid.ma'),
        new OA\Property(property: 'role', type: 'string', example: 'admin'),
        new OA\Property(property: 'status', type: 'string', example: 'active'),
        new OA\Property(property: 'avatar_url', type: 'string', nullable: true, example: null),
        new OA\Property(property: 'email_verified_at', type: 'string', format: 'datetime', nullable: true),
        new OA\Property(property: 'last_login_at', type: 'string', format: 'datetime', nullable: true),
        new OA\Property(property: 'created_at', type: 'string', format: 'datetime'),
    ],
    type: 'object'
)]
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status,
            'avatar_url' => $this->avatar_url,
            'email_verified_at' => $this->email_verified_at,
            'last_login_at' => $this->last_login_at,
            'created_at' => $this->created_at,
        ];
    }
}
