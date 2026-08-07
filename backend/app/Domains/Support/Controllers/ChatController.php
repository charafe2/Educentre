<?php

namespace App\Domains\Support\Controllers;

use App\Domains\Support\Models\Conversation;
use App\Domains\Support\Models\Message;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class ChatController extends Controller
{
    public function getConversations(Request $request)
    {
        $user = $request->user();
        
        $query = Conversation::where('tenant_id', $user->tenant_id)
            ->with(['user', 'agent']);

        if (!$user->is_owner && !in_array('support', $user->permissions ?? [])) {
            $query->where('user_id', $user->id);
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest('updated_at')->get()
        ]);
    }

    public function getMessages(Request $request, $conversationUuid)
    {
        $conversation = Conversation::where('uuid', $conversationUuid)
            ->where('tenant_id', $request->user()->tenant_id)
            ->firstOrFail();

        $messages = $conversation->messages()->with('sender')->oldest()->get();

        return response()->json([
            'success' => true,
            'data' => $messages
        ]);
    }

    public function sendMessage(Request $request, $conversationUuid)
    {
        $request->validate([
            'content' => 'required|string|max:1000'
        ]);

        $conversation = Conversation::where('uuid', $conversationUuid)
            ->where('tenant_id', $request->user()->tenant_id)
            ->firstOrFail();

        $message = $conversation->messages()->create([
            'sender_type' => get_class($request->user()),
            'sender_id' => $request->user()->id,
            'content' => $request->content,
            'is_read' => false
        ]);

        $conversation->touch(); // Update conversation timestamp

        broadcast(new MessageSent($message->load('sender', 'conversation')))->toOthers();

        return response()->json([
            'success' => true,
            'data' => $message
        ]);
    }

    public function startConversation(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:120',
        ]);

        $conversation = Conversation::create([
            'tenant_id' => $request->user()->tenant_id,
            'user_id' => $request->user()->id,
            'status' => 'pending',
            'subject' => $request->subject,
        ]);

        broadcast(new \App\Events\NewTicketCreated($conversation));

        return response()->json([
            'success' => true,
            'data' => $conversation
        ], 201);
    }
}
