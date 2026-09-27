<?php

use App\Domains\Marketing\Controllers\DemoRequestController;
use Illuminate\Support\Facades\Route;

// Public landing-page lead form — no auth (there's no tenant yet), but
// throttled since every hit sends a real email.
Route::post('demo-requests', [DemoRequestController::class, 'store'])
    ->middleware('throttle:5,1');
