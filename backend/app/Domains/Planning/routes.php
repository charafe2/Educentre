<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Planning\Controllers\ClassController;
use App\Domains\Planning\Controllers\GroupController;
use App\Domains\Planning\Controllers\SessionController;
use App\Domains\Planning\Controllers\SessionAttendanceController;

Route::middleware('auth:sanctum')->prefix('classes')->group(function () {
    Route::get('/', [ClassController::class, 'index']);
    Route::get('/{id}', [ClassController::class, 'show']);
    Route::post('/', [ClassController::class, 'store']);
    Route::put('/{id}', [ClassController::class, 'update']);
    Route::delete('/{id}', [ClassController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->prefix('groups')->group(function () {
    Route::get('/', [GroupController::class, 'index']);
    Route::post('/', [GroupController::class, 'store']);
    Route::put('/{id}/capacity', [GroupController::class, 'updateCapacity']);
    Route::post('/move-student', [GroupController::class, 'moveStudent']);
});

Route::middleware('auth:sanctum')->prefix('sessions')->group(function () {
    Route::get('/', [SessionController::class, 'index']);
    Route::get('/today', [SessionController::class, 'today']);
    Route::post('/', [SessionController::class, 'store']);
    Route::put('/{id}', [SessionController::class, 'update']);
    Route::post('/{id}/cancel', [SessionController::class, 'cancel']);
    Route::get('/{sessionId}/attendance', [SessionAttendanceController::class, 'index']);
    Route::post('/{sessionId}/attendance', [SessionAttendanceController::class, 'store']);
    Route::delete('/{id}', [SessionController::class, 'destroy']);
});
