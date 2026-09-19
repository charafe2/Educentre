<?php

use App\Domains\Support\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/conversations', [ChatController::class, 'getConversations']);
    Route::post('/conversations', [ChatController::class, 'startConversation']);
    Route::get('/conversations/{uuid}/messages', [ChatController::class, 'getMessages']);
    Route::post('/conversations/{uuid}/messages', [ChatController::class, 'sendMessage']);
});
