<?php

use Illuminate\Support\Facades\Route;
use App\Domains\Planning\Controllers\AcademicLevelController;
use App\Domains\Planning\Controllers\ClassController;
use App\Domains\Planning\Controllers\GroupController;
use App\Domains\Planning\Controllers\RoomController;
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

// Subjects and academic levels share one global catalog (also managed by
// the Super Admin, see Domains/SuperAdmin), but a tenant may also add its
// own name to either — a name a tenant creates that another centre already
// added is reused, not duplicated — and remove one of its own assignments
// (the global catalog row and every other tenant's assignment are
// untouched; see SubjectService/AcademicLevelService::removeForTenant()).
Route::middleware('staff')->prefix('subjects')->group(function () {
    Route::get('/', [SubjectController::class, 'index']);
    Route::post('/', [SubjectController::class, 'store']);
    Route::delete('/{id}', [SubjectController::class, 'destroy']);
});

Route::middleware('staff')->prefix('academic-levels')->group(function () {
    Route::get('/', [AcademicLevelController::class, 'index']);
    Route::post('/', [AcademicLevelController::class, 'store']);
    Route::delete('/{id}', [AcademicLevelController::class, 'destroy']);
});

Route::middleware('staff')->prefix('groups')->group(function () {
    Route::get('/', [GroupController::class, 'index']);
    Route::post('/', [GroupController::class, 'store']);
    Route::put('/{id}/capacity', [GroupController::class, 'updateCapacity']);
    Route::put('/{id}', [GroupController::class, 'update']);
    Route::delete('/{id}', [GroupController::class, 'destroy']);
    Route::post('/move-student', [GroupController::class, 'moveStudent']);
    Route::post('/remove-student', [GroupController::class, 'removeStudent']);
});

Route::middleware('staff')->prefix('rooms')->group(function () {
    Route::get('/', [RoomController::class, 'index']);
    Route::post('/', [RoomController::class, 'store']);
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
