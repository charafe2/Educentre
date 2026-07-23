<?php

namespace App\Events;

use App\Domains\Notifications\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcasts whenever a notification is created, so the web/mobile clients
 * can update in real time once real-time transport (Reverb) is configured.
 * Today BROADCAST_CONNECTION=log, so this is a harmless no-op — enabling
 * live delivery later needs no backend code changes, just env vars + a
 * running Reverb server.
 */
class NotificationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Notification $notification) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('tenant.'.$this->notification->tenant_id);
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'type' => $this->notification->type,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'userId' => $this->notification->user_id,
        ];
    }
}
