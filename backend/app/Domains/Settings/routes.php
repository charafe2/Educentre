<?php

use App\Domains\Settings\Controllers\SettingsController;
use App\Domains\Settings\Controllers\SettingsUsersController;
use Illuminate\Support\Facades\Route;

Route::prefix('settings')->middleware('auth:sanctum')->group(function () {
    Route::get('centre', [SettingsController::class, 'centre']);
    Route::put('centre', [SettingsController::class, 'updateCentre']);
    Route::post('support-request', [SettingsController::class, 'sendSupportRequest']);

    Route::get('users', [SettingsUsersController::class, 'index']);
    Route::post('users', [SettingsUsersController::class, 'store']);
    Route::put('users/{uuid}', [SettingsUsersController::class, 'update']);
    Route::delete('users/{uuid}', [SettingsUsersController::class, 'destroy']);
});
