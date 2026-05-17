<?php

namespace App\Domains\Settings\Services;

use App\Models\Tenant;

class SettingsService
{
    public function updateCentre(Tenant $tenant, array $data): void
    {
        $settings = array_merge(
            $tenant->settings ?? [],
            array_diff_key($data, ['name' => null]),
        );

        $tenant->update([
            'name' => $data['name'] ?? $tenant->name,
            'settings' => $settings,
        ]);
    }
}
