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
        // `token` (not tenant_id) is the real unique key here — the same
        // physical device can legitimately re-register under a different
        // tenant/user (e.g. someone logs into a different centre's account
        // on the same phone), and ownership must transfer cleanly rather
        // than fail on the column's unique constraint. Matching without a
        // tenant filter is intentional; withoutGlobalScopes makes that
        // explicit instead of relying on the ambient tenant scope to happen
        // to produce the same result.
        DeviceToken::withoutGlobalScopes()->updateOrCreate(
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
