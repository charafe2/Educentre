<?php

use App\Domains\Notifications\Controllers\DeviceTokenController;
use App\Domains\Notifications\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::middleware('staff')->prefix('notifications')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::patch('/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('/{id}', [NotificationController::class, 'destroy']);
});

Route::middleware('staff')->prefix('device-tokens')->group(function () {
    Route::post('/', [DeviceTokenController::class, 'store']);
    Route::delete('/{token}', [DeviceTokenController::class, 'destroy']);
});
