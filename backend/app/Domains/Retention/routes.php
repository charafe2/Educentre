<?php

use App\Domains\Retention\Controllers\StudentAttritionRiskController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('retention')->group(function () {
    Route::get('/student-risks', [StudentAttritionRiskController::class, 'index']);
});
