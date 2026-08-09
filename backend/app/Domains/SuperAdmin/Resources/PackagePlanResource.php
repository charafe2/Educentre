<?php

namespace App\Domains\SuperAdmin\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PackagePlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            // Cast to float: the frontend does arithmetic on this.
            'monthlyPrice' => (float) $this->monthly_price,
            'usersLimit' => (int) $this->users_limit,
            'studentsLimit' => (int) $this->students_limit,
            'storageGb' => (int) $this->storage_gb,
            'supportLevel' => $this->support_level,
            'status' => $this->status,
            'features' => $this->features ?? [],
        ];
    }
}
