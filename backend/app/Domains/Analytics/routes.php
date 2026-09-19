<?php

use App\Domains\Analytics\Controllers\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::middleware('staff')->prefix('analytics')->group(function () {
    Route::get('/report', [AnalyticsController::class, 'report']);
});
