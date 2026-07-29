<?php

use App\Domains\Retention\Controllers\StudentAttritionRiskController;
use Illuminate\Support\Facades\Route;

Route::middleware('staff')->prefix('retention')->group(function () {
    Route::get('/student-risks', [StudentAttritionRiskController::class, 'index']);
});
