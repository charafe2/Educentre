<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Notification broadcasts (see App\Events\NotificationCreated) go out per
// tenant; any authenticated user belonging to that tenant may listen.
Broadcast::channel('tenant.{tenantId}', function ($user, $tenantId) {
    return (int) $user->tenant_id === (int) $tenantId;
});

Broadcast::channel('chat.{conversationUuid}', function ($user, $conversationUuid) {
    // If the user is a SuperAdmin (they have a different model class), they can access all chats
    if (get_class($user) === \App\Models\SuperAdmin::class) {
        return true;
    }

    $conversation = \App\Domains\Support\Models\Conversation::where('uuid', $conversationUuid)->first();
    if (!$conversation || $conversation->tenant_id !== $user->tenant_id) {
        return false;
    }
    return $user->is_owner || in_array('support', $user->permissions ?? []) || $conversation->user_id === $user->id;
}, ['guards' => ['sanctum']]);

Broadcast::channel('superadmin.tickets', function ($user) {
    return get_class($user) === \App\Models\SuperAdmin::class;
}, ['guards' => ['sanctum']]);
