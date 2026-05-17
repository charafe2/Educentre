<?php

use App\Domains\Settings\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('settings')->middleware('auth:sanctum')->group(function () {
    Route::get('centre', [SettingsController::class, 'centre']);
    Route::put('centre', [SettingsController::class, 'updateCentre']);
});
