<?php

namespace App\Domains\Notifications\Providers;

use App\Domains\Notifications\Contracts\PushProvider;
use App\Domains\Notifications\Models\DeviceToken;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends push notifications via Expo's push service (https://exp.host), which
 * wraps FCM/APNs delivery without requiring a separate Firebase/Apple project.
 * A plain HTTP call — no SDK dependency needed. Swapping to a different
 * provider later only means writing a new PushProvider implementation.
 */
class ExpoPushProvider implements PushProvider
{
    private const ENDPOINT = 'https://exp.host/--/api/v2/push/send';

    public function send(DeviceToken $deviceToken, string $title, string $body, array $data = []): void
    {
        try {
            $response = Http::post(self::ENDPOINT, [
                'to' => $deviceToken->token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
            ]);

            if ($response->failed()) {
                Log::warning('Expo push notification failed', [
                    'device_token_id' => $deviceToken->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }
        } catch (\Throwable $e) {
            // Push delivery is best-effort: a failed/unreachable push service
            // must never break the request that triggered the notification.
            Log::warning('Expo push notification threw an exception', [
                'device_token_id' => $deviceToken->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
