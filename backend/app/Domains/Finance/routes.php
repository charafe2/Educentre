<?php

use App\Domains\Finance\Controllers\ExpenseController;
use App\Domains\Finance\Controllers\PaymentController;
use App\Domains\Finance\Controllers\TeacherPaymentController;
use Illuminate\Support\Facades\Route;

Route::middleware('staff')->prefix('payments')->group(function () {
    Route::get('/', [PaymentController::class, 'index']);
    Route::post('/', [PaymentController::class, 'store']);
    Route::post('/batch', [PaymentController::class, 'batch']);
    Route::delete('/receipt/{number}', [PaymentController::class, 'cancelReceipt']);
    Route::put('/{id}', [PaymentController::class, 'update']);
    Route::post('/{id}/mark-paid', [PaymentController::class, 'markAsPaid']);
    Route::delete('/{id}', [PaymentController::class, 'destroy']);
});

Route::middleware('staff')->prefix('expenses')->group(function () {
    Route::get('/', [ExpenseController::class, 'index']);
    Route::post('/', [ExpenseController::class, 'store']);
    Route::delete('/{id}', [ExpenseController::class, 'destroy']);
});

Route::middleware('staff')->prefix('teacher-payments')->group(function () {
    Route::get('/', [TeacherPaymentController::class, 'index']);
    Route::post('/{teacherId}/mark-paid', [TeacherPaymentController::class, 'markAsPaid']);
    Route::delete('/{teacherId}', [TeacherPaymentController::class, 'destroy']);
});

// Webhook endpoint (must be public to receive events from Stripe)
Route::post('/webhooks/stripe', [\App\Domains\Finance\Controllers\StripeWebhookController::class, 'handle']);
