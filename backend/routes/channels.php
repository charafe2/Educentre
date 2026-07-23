<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Notification broadcasts (see App\Events\NotificationCreated) go out per
// tenant; any authenticated user belonging to that tenant may listen.
Broadcast::channel('tenant.{tenantId}', function ($user, $tenantId) {
    return (int) $user->tenant_id === (int) $tenantId;
});
