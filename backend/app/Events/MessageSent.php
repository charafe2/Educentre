<?php

namespace App\Events;

use App\Domains\Support\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('chat.'.$this->message->conversation->uuid),
            new PrivateChannel('superadmin.tickets'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'uuid' => $this->message->uuid,
            'conversation_id' => $this->message->conversation->uuid,
            'sender_id' => $this->message->sender->uuid ?? $this->message->sender_id,
            'sender_type' => $this->message->sender_type,
            // Without this the receiving client has no name to show and falls
            // back to a generic label on every realtime message.
            'sender' => [
                'uuid' => $this->message->sender->uuid ?? null,
                'name' => $this->message->sender->name ?? null,
            ],
            'content' => $this->message->content,
            'is_read' => $this->message->is_read,
            'created_at' => $this->message->created_at->toIso8601String(),
        ];
    }
}
