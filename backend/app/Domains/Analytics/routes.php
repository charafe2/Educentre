<?php

use App\Domains\Analytics\Controllers\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('analytics')->group(function () {
    Route::get('/report', [AnalyticsController::class, 'report']);
});
