<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Planning\Controllers\ClassController;
use App\Domains\Planning\Controllers\GroupController;

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
