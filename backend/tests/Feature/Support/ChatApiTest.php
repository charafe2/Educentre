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

    private function chatUser(): User
    {
        $tenant = Tenant::factory()->create();

        return User::factory()->for($tenant)->create();
    }
}
