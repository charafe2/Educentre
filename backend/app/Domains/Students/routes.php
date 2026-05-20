<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Students\Controllers\StudentController;

Route::middleware('auth:sanctum')->prefix('students')->group(function () {
    Route::get('/', [StudentController::class, 'index']);
    Route::post('/', [StudentController::class, 'store']);
    Route::put('/{id}', [StudentController::class, 'update']);
    Route::delete('/{id}', [StudentController::class, 'destroy']);
});
