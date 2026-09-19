<?php

namespace App\Domains\Notifications\Contracts;

use App\Domains\Notifications\Models\DeviceToken;

interface PushProvider
{
    /**
     * Send a single push message to one registered device.
     *
     * @param  array<string, mixed>  $data  Arbitrary payload delivered alongside the push
     *                                      (e.g. notification type / related entity), used
     *                                      by the receiving app to navigate on tap.
     */
    public function send(DeviceToken $deviceToken, string $title, string $body, array $data = []): void;
}
