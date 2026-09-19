<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Jobs\ProcessStripeWebhook;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $payload = $request->all();
        
        // TODO: In production, verify the Stripe signature here using Stripe SDK
        // $signature = $request->header('Stripe-Signature');
        
        Log::info('Received Stripe Webhook', ['type' => $payload['type'] ?? 'unknown']);

        // Dispatch job to Redis queue so we can return 200 OK to Stripe immediately
        ProcessStripeWebhook::dispatch($payload);

        return response()->json(['status' => 'success']);
    }
}
