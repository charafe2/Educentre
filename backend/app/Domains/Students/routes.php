<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Students\Controllers\StudentController;
use App\Domains\Students\Controllers\ParentAuthController;

Route::middleware('staff')->prefix('students')->group(function () {
    Route::get('/', [StudentController::class, 'index']);
    Route::post('/', [StudentController::class, 'store']);
    Route::put('/{id}', [StudentController::class, 'update']);
    Route::delete('/{id}', [StudentController::class, 'destroy']);
});

Route::prefix('parent/auth')->group(function () {
    Route::post('login', [ParentAuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'parent'])->group(function () {
        Route::post('logout', [ParentAuthController::class, 'logout']);
        Route::get('me', [ParentAuthController::class, 'me']);
    });
});
