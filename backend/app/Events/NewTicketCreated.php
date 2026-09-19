<?php

namespace App\Events;

use App\Domains\Support\Models\Conversation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewTicketCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Conversation $conversation) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('superadmin.tickets'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.created';
    }

    public function broadcastWith(): array
    {
        $this->conversation->load('user', 'user.tenant');

        return [
            'id' => $this->conversation->id,
            'uuid' => $this->conversation->uuid,
            'status' => $this->conversation->status,
            'subject' => $this->conversation->subject,
            'user' => [
                'name' => $this->conversation->user->name ?? 'Utilisateur',
                'email' => $this->conversation->user->email ?? '',
                'tenant' => [
                    'name' => $this->conversation->user->tenant->name ?? '',
                ],
            ],
            'created_at' => $this->conversation->created_at->toIso8601String(),
            'updated_at' => $this->conversation->updated_at->toIso8601String(),
        ];
    }
}
