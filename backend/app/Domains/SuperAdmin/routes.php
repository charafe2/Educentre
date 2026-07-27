<?php

use App\Domains\SuperAdmin\Controllers\AcademicLevelController;
use App\Domains\SuperAdmin\Controllers\CentreController;
use App\Domains\SuperAdmin\Controllers\SubjectController;
use App\Domains\SuperAdmin\Controllers\SuperAdminAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('superadmin')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('login', [SuperAdminAuthController::class, 'login']);

        Route::middleware(['auth:sanctum', 'superadmin'])->group(function () {
            Route::post('logout', [SuperAdminAuthController::class, 'logout']);
            Route::get('me', [SuperAdminAuthController::class, 'me']);
        });
    });

    Route::middleware(['auth:sanctum', 'superadmin'])->group(function () {
        Route::prefix('subjects')->group(function () {
            Route::get('/', [SubjectController::class, 'index']);
            Route::post('/', [SubjectController::class, 'store']);
            Route::put('/{id}', [SubjectController::class, 'update']);
            Route::delete('/{id}', [SubjectController::class, 'destroy']);
        });

        Route::prefix('academic-levels')->group(function () {
            Route::get('/', [AcademicLevelController::class, 'index']);
            Route::post('/', [AcademicLevelController::class, 'store']);
            Route::put('/{id}', [AcademicLevelController::class, 'update']);
            Route::delete('/{id}', [AcademicLevelController::class, 'destroy']);
        });

        Route::prefix('centres')->group(function () {
            Route::get('/', [CentreController::class, 'index']);
            Route::get('/{centreId}/subjects', [CentreController::class, 'subjects']);
            Route::put('/{centreId}/subjects', [CentreController::class, 'syncSubjects']);
            Route::get('/{centreId}/academic-levels', [CentreController::class, 'academicLevels']);
            Route::put('/{centreId}/academic-levels', [CentreController::class, 'syncAcademicLevels']);
            Route::patch('/{centreId}/max-users', [CentreController::class, 'updateMaxUsers']);
        });
    });
});
