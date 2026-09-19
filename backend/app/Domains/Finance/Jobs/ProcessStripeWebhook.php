<?php

namespace App\Domains\Finance\Jobs;

use App\Events\NotificationCreated;
use App\Domains\Notifications\Models\Notification;
use App\Domains\Auth\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessStripeWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public array $payload) {}

    public function handle(): void
    {
        // Example: Process the Stripe payload here
        $type = $this->payload['type'] ?? 'unknown';

        if ($type === 'payment_intent.succeeded') {
            // Find the relevant user/tenant based on metadata (omitted for brevity)
            // $tenantId = $this->payload['data']['object']['metadata']['tenant_id'];
            
            // For now, let's notify super admins or the relevant tenant owner
            // This is a placeholder logic
            $owners = User::where('is_owner', true)->get();
            
            foreach ($owners as $owner) {
                $notification = Notification::create([
                    'tenant_id' => $owner->tenant_id,
                    'user_id' => $owner->id,
                    'type' => 'success',
                    'title' => 'Payment Received',
                    'message' => 'A successful payment was recorded via Stripe.',
                ]);
                
                // Dispatch real-time event to the frontend
                event(new NotificationCreated($notification));
            }
        }
    }
}
