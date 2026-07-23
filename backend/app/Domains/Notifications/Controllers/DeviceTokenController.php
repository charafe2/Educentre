<?php

namespace App\Domains\Notifications\Controllers;

use App\Domains\Notifications\Models\DeviceToken;
use App\Domains\Notifications\Requests\StoreDeviceTokenRequest;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeviceTokenController extends Controller
{
    public function store(StoreDeviceTokenRequest $request): JsonResponse
    {
        DeviceToken::updateOrCreate(
            ['token' => $request->validated('token')],
            [
                'tenant_id' => $request->user()->tenant_id,
                'user_id' => $request->user()->id,
                'platform' => $request->validated('platform'),
            ],
        );

        return $this->success(null, 'Appareil enregistré pour les notifications.', 201);
    }

    public function destroy(string $token, Request $request): JsonResponse
    {
        DeviceToken::query()
            ->where('tenant_id', $request->user()->tenant_id)
            ->where('user_id', $request->user()->id)
            ->where('token', $token)
            ->delete();

        return $this->success(null, 'Appareil désenregistré.');
    }
}
