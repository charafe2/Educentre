<?php

namespace App\Domains\SuperAdmin\Events;

use App\Models\SuperAdmin;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SuperAdminLoggedIn
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly SuperAdmin $user
    ) {}
}
