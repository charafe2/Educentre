<?php

namespace App\Domains\Settings\Resources;

use App\Domains\Core\Models\PackagePlan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps a tenant's Subscription row. `plan` on Subscription is a plain
 * string (matched against PackagePlan.name at write time — see
 * CentreService::syncSubscription), not a foreign key, so the matching
 * catalogue plan is looked up here to surface its features/limits. A
 * subscription always resolves to a real plan in practice, but the lookup
 * degrades gracefully (empty limits/features) if the catalogue entry was
 * since renamed or removed.
 */
class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $catalogue = PackagePlan::where('name', $this->plan)->first();

        return [
            'plan' => $this->plan,
            'monthlyPrice' => (float) $this->monthly_price,
            'status' => $this->status,
            'startDate' => $this->start_date?->toDateString(),
            'endDate' => $this->end_date?->toDateString(),
            'usersLimit' => $catalogue?->users_limit,
            'studentsLimit' => $catalogue?->students_limit,
            'storageGb' => $catalogue?->storage_gb,
            'supportLevel' => $catalogue?->support_level,
            'features' => $catalogue?->features ?? [],
        ];
    }
}
