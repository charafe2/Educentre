<?php

namespace App\Domains\Settings\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettingsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $settings = $this->settings ?? [];

        return [
            'name' => $this->name,
            'type' => $settings['type'] ?? '',
            'city' => $settings['city'] ?? '',
            'address' => $settings['address'] ?? '',
            'phone' => $settings['phone'] ?? '',
            'whatsapp' => $settings['whatsapp'] ?? '',
        ];
    }
}
