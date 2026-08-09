<?php

use App\Domains\Finance\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('staff')->prefix('payments')->group(function () {
    Route::get('/', [PaymentController::class, 'index']);
    Route::post('/', [PaymentController::class, 'store']);
    Route::put('/{id}', [PaymentController::class, 'update']);
    Route::post('/{id}/mark-paid', [PaymentController::class, 'markAsPaid']);
    Route::delete('/{id}', [PaymentController::class, 'destroy']);
});

// Webhook endpoint (must be public to receive events from Stripe)
Route::post('/webhooks/stripe', [\App\Domains\Finance\Controllers\StripeWebhookController::class, 'handle']);
