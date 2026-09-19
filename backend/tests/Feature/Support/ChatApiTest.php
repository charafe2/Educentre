<?php

namespace Tests\Feature\Support;

use App\Events\NewTicketCreated;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_starting_a_conversation_requires_a_subject(): void
    {
        $user = $this->chatUser();

        $this->actingAs($user)
            ->postJson('/api/v1/conversations', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('subject');
    }

    public function test_starting_a_conversation_persists_and_broadcasts_the_subject(): void
    {
        Event::fake([NewTicketCreated::class]);

        $user = $this->chatUser();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/conversations', ['subject' => 'Problème de facturation'])
            ->assertCreated()
            ->assertJsonPath('data.subject', 'Problème de facturation');

        $conversationId = $response->json('data.id');

        $this->assertDatabaseHas('conversations', [
            'id' => $conversationId,
            'subject' => 'Problème de facturation',
        ]);

        Event::assertDispatched(NewTicketCreated::class, function (NewTicketCreated $event) use ($conversationId) {
            return $event->conversation->id === $conversationId
                && $event->conversation->subject === 'Problème de facturation';
        });
    }

    public function test_new_ticket_broadcast_payload_includes_subject(): void
    {
        $user = $this->chatUser();

        $conversation = \App\Domains\Support\Models\Conversation::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'status' => 'pending',
            'subject' => 'Problème de facturation',
        ]);

        $payload = (new \App\Events\NewTicketCreated($conversation))->broadcastWith();

        $this->assertArrayHasKey('subject', $payload);
        $this->assertSame('Problème de facturation', $payload['subject']);
    }

    public function test_conversation_exposes_its_latest_message(): void
    {
        $user = $this->chatUser();

        $conversation = \App\Domains\Support\Models\Conversation::create([
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'status' => 'open',
            'subject' => 'Facturation',
        ]);

        foreach (['Premier message', 'Deuxième message', 'Dernier message'] as $content) {
            $conversation->messages()->create([
                'sender_type' => User::class,
                'sender_id' => $user->id,
                'content' => $content,
                'is_read' => false,
            ]);
        }

        // The agent inbox renders this as the preview line under each subject,
        // so it must be the newest message rather than the first one written.
        $this->assertSame(
            'Dernier message',
            $conversation->fresh()->latestMessage->content
        );
    }

    public function test_broadcasting_auth_is_reachable_under_the_api_prefix(): void
    {
        $user = $this->chatUser();

        // The Angular client authorizes private channels against
        // `${environment.apiUrl}/broadcasting/auth` — i.e. /api/broadcasting/auth,
        // because that is the only prefix nginx proxies through to Laravel.
        // If the route is not registered there every private-channel
        // subscription 404s and realtime updates silently stop arriving.
        $this->actingAs($user)
            ->postJson('/api/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-tenant.'.$user->tenant_id,
            ])
            ->assertSuccessful();
    }

    private function chatUser(): User
    {
        $tenant = Tenant::factory()->create();

        return User::factory()->for($tenant)->create();
    }
}
