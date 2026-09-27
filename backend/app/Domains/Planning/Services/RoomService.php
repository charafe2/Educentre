<?php

namespace App\Domains\Planning\Services;

use App\Domains\Planning\Models\Room;
use Illuminate\Database\Eloquent\Collection;

class RoomService
{
    public function all(int $tenantId): Collection
    {
        return Room::query()->where('tenant_id', $tenantId)->where('is_active', true)->orderBy('name')->get();
    }

    public function create(int $tenantId, array $data): Room
    {
        return Room::create([
            'tenant_id' => $tenantId,
            'name' => trim($data['name']),
            'capacity' => $data['capacity'] ?? 0,
            'is_active' => true,
        ]);
    }
}
