<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Teachers\Controllers\TeacherController;

Route::middleware('staff')->prefix('teachers')->group(function () {
    Route::get('/', [TeacherController::class, 'index']);
    Route::get('/{id}', [TeacherController::class, 'show']);
    Route::post('/', [TeacherController::class, 'store']);
    Route::put('/{id}', [TeacherController::class, 'update']);
    Route::delete('/{id}', [TeacherController::class, 'destroy']);
    Route::post('/{id}/access/reset-password', [TeacherController::class, 'resetPassword']);
    Route::post('/{id}/access/suspend', [TeacherController::class, 'suspend']);
    Route::post('/{id}/access/revoke', [TeacherController::class, 'revoke']);
    Route::post('/{id}/access/reactivate', [TeacherController::class, 'reactivate']);
});
