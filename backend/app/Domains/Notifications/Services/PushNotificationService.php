<?php

namespace App\Domains\Notifications\Services;

use App\Domains\Notifications\Contracts\PushProvider;
use App\Domains\Notifications\Models\DeviceToken;
use App\Models\User;

class PushNotificationService
{
    public function __construct(private readonly PushProvider $provider) {}

    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = DeviceToken::query()->where('user_id', $user->id)->get();

        foreach ($tokens as $token) {
            $this->provider->send($token, $title, $body, $data);
        }
    }
}
