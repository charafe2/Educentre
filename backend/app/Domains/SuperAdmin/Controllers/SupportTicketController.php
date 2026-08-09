<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Support\Models\Conversation;
use App\Domains\Support\Models\Message;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class SupportTicketController extends Controller
{
    public function index(Request $request)
    {
        $query = Conversation::with(['user', 'agent', 'user.tenant', 'latestMessage'])
            ->withCount(['messages as unread_count' => function ($query) {
                $query->where('is_read', false)->where('sender_type', \App\Models\User::class);
            }]);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('mine')) {
            $query->where('agent_id', $request->user()->id);
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest('updated_at')->paginate(20)
        ]);
    }

    public function show(Request $request, $uuid)
    {
        $conversation = Conversation::where('uuid', $uuid)->with('user', 'agent', 'user.tenant')->firstOrFail();
        
        // Mark user messages as read
        $conversation->messages()->where('sender_type', \App\Models\User::class)->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'data' => $conversation
        ]);
    }

    public function getMessages(Request $request, $uuid)
    {
        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
        $messages = $conversation->messages()->with('sender')->oldest()->get();

        return response()->json([
            'success' => true,
            'data' => $messages
        ]);
    }

    public function sendMessage(Request $request, $uuid)
    {
        $request->validate(['content' => 'required|string']);

        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();

        // If ticket isn't claimed, claim it automatically
        if (!$conversation->agent_id) {
            $conversation->agent_id = $request->user()->id;
        }

        $message = $conversation->messages()->create([
            'sender_type' => get_class($request->user()), // \App\Models\SuperAdmin
            'sender_id' => $request->user()->id,
            'content' => $request->content,
            'is_read' => false
        ]);

        if ($conversation->status === 'closed' || $conversation->status === 'pending') {
            $conversation->status = 'open'; // Reopen or open
        }
        $conversation->touch();
        $conversation->save();

        broadcast(new MessageSent($message->load('sender', 'conversation')))->toOthers();

        return response()->json([
            'success' => true,
            'data' => $message
        ]);
    }

    public function claim(Request $request, $uuid)
    {
        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
        
        $conversation->update([
            'agent_id' => $request->user()->id,
            'status' => 'open'
        ]);

        return response()->json(['success' => true, 'data' => $conversation]);
    }

    public function close(Request $request, $uuid)
    {
        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
        
        $conversation->update(['status' => 'closed']);

        return response()->json(['success' => true, 'data' => $conversation]);
    }

    public function updateStatus(Request $request, $uuid)
    {
        $request->validate(['status' => 'required|string|in:pending,open,in_progress,closed']);
        
        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
        
        $conversation->update(['status' => $request->status]);

        return response()->json(['success' => true, 'data' => $conversation]);
    }

    public function updateNotes(Request $request, $uuid)
    {
        $request->validate(['notes' => 'nullable|string']);
        
        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
        
        $conversation->update(['internal_notes' => $request->notes]);

        return response()->json(['success' => true, 'data' => $conversation]);
    }

    public function assignTo(Request $request, $uuid)
    {
        $request->validate(['agent_id' => 'required|exists:super_admins,id']);
        
        $conversation = Conversation::where('uuid', $uuid)->firstOrFail();
        
        $conversation->update([
            'agent_id' => $request->agent_id,
            'status' => $conversation->status === 'pending' ? 'open' : $conversation->status
        ]);

        return response()->json(['success' => true, 'data' => $conversation->load('agent')]);
    }
}
