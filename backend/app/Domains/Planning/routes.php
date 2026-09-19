<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Planning\Controllers\AcademicLevelController;
use App\Domains\Planning\Controllers\ClassController;
use App\Domains\Planning\Controllers\GroupController;
use App\Domains\Planning\Controllers\SessionController;
use App\Domains\Planning\Controllers\SessionAttendanceController;
use App\Domains\Planning\Controllers\SubjectController;

Route::middleware('staff')->prefix('classes')->group(function () {
    Route::get('/', [ClassController::class, 'index']);
    Route::get('/{id}', [ClassController::class, 'show']);
    Route::post('/', [ClassController::class, 'store']);
    Route::put('/{id}', [ClassController::class, 'update']);
    Route::delete('/{id}', [ClassController::class, 'destroy']);
});

// Subjects and academic levels are global catalogs managed only by the Super
// Admin (see Domains/SuperAdmin). Tenants only ever read what's assigned.
Route::middleware('staff')->prefix('subjects')->group(function () {
    Route::get('/', [SubjectController::class, 'index']);
});

Route::middleware('staff')->prefix('academic-levels')->group(function () {
    Route::get('/', [AcademicLevelController::class, 'index']);
});

Route::middleware('staff')->prefix('groups')->group(function () {
    Route::get('/', [GroupController::class, 'index']);
    Route::post('/', [GroupController::class, 'store']);
    Route::put('/{id}/capacity', [GroupController::class, 'updateCapacity']);
    Route::post('/move-student', [GroupController::class, 'moveStudent']);
});

Route::middleware('staff')->prefix('sessions')->group(function () {
    Route::get('/', [SessionController::class, 'index']);
    Route::get('/today', [SessionController::class, 'today']);
    Route::post('/', [SessionController::class, 'store']);
    Route::put('/{id}', [SessionController::class, 'update']);
    Route::post('/{id}/cancel', [SessionController::class, 'cancel']);
    Route::get('/{sessionId}/attendance', [SessionAttendanceController::class, 'index']);
    Route::post('/{sessionId}/attendance', [SessionAttendanceController::class, 'store']);
    Route::delete('/{id}', [SessionController::class, 'destroy']);
});
