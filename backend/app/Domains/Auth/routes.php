<?php

use App\Domains\Auth\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('verify-password', [AuthController::class, 'verifyPassword'])
        ->middleware('throttle:20,1');

    // Step 2 of a multitenant login: authenticates via the short-lived
    // `centre-select`-scoped token minted in AuthService::beginCentreSelection,
    // so it deliberately sits outside the 'staff' middleware group (which
    // that restricted token is barred from — see EnsureStaffUser).
    Route::post('select-centre', [AuthController::class, 'selectCentre'])
        ->middleware(['auth:sanctum', 'throttle:20,1']);

    Route::middleware('staff')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::put('password/change', [AuthController::class, 'changePassword']);
    });
});
