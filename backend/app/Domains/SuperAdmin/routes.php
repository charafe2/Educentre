<?php

use App\Domains\SuperAdmin\Controllers\AcademicLevelController;
use App\Domains\SuperAdmin\Controllers\CentreController;
use App\Domains\SuperAdmin\Controllers\CentreInvoiceController;
use App\Domains\SuperAdmin\Controllers\PackagePlanController;
use App\Domains\SuperAdmin\Controllers\SubjectController;
use App\Domains\SuperAdmin\Controllers\SuperAdminAccountController;
use App\Domains\SuperAdmin\Controllers\SupportTicketController;
use App\Domains\SuperAdmin\Controllers\SuperAdminAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('superadmin')->group(function () {

    // ── Public auth ──
    Route::prefix('auth')->group(function () {
        Route::post('login', [SuperAdminAuthController::class, 'login']);
    });

    // ── Protected routes ──
    Route::middleware(['auth:sanctum', 'superadmin'])->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [SuperAdminAuthController::class, 'logout']);
            Route::get('me', [SuperAdminAuthController::class, 'me']);
        });

        // Assignable operators (tickets page)
        Route::get('superadmins', [SuperAdminAuthController::class, 'index']);

        // Superadmin account management
        Route::prefix('accounts')->group(function () {
            Route::get('/', [SuperAdminAccountController::class, 'index']);
            Route::post('/', [SuperAdminAccountController::class, 'store']);
            Route::get('/{id}', [SuperAdminAccountController::class, 'show']);
            Route::put('/{id}', [SuperAdminAccountController::class, 'update']);
            Route::post('/{id}/toggle-status', [SuperAdminAccountController::class, 'toggleStatus']);
            Route::delete('/{id}', [SuperAdminAccountController::class, 'destroy']);
        });

        // Tickets
        Route::prefix('tickets')->group(function () {
            Route::get('/', [SupportTicketController::class, 'index']);
            Route::get('/{uuid}', [SupportTicketController::class, 'show']);
            Route::get('/{uuid}/messages', [SupportTicketController::class, 'getMessages']);
            Route::post('/{uuid}/messages', [SupportTicketController::class, 'sendMessage']);
            Route::post('/{uuid}/claim', [SupportTicketController::class, 'claim']);
            Route::post('/{uuid}/close', [SupportTicketController::class, 'close']);
            Route::put('/{uuid}/status', [SupportTicketController::class, 'updateStatus']);
            Route::put('/{uuid}/notes', [SupportTicketController::class, 'updateNotes']);
            Route::put('/{uuid}/assign', [SupportTicketController::class, 'assignTo']);
        });

        // Subjects
        Route::prefix('subjects')->group(function () {
            Route::get('/', [SubjectController::class, 'index']);
            Route::post('/', [SubjectController::class, 'store']);
            Route::put('/{id}', [SubjectController::class, 'update']);
            Route::delete('/{id}', [SubjectController::class, 'destroy']);
        });

        // Academic Levels
        Route::prefix('academic-levels')->group(function () {
            Route::get('/', [AcademicLevelController::class, 'index']);
            Route::post('/', [AcademicLevelController::class, 'store']);
            Route::put('/{id}', [AcademicLevelController::class, 'update']);
            Route::delete('/{id}', [AcademicLevelController::class, 'destroy']);
        });

        // Centres
        Route::prefix('centres')->group(function () {
            Route::get('/', [CentreController::class, 'index']);
            Route::get('/{centreId}/subjects', [CentreController::class, 'subjects']);
            Route::put('/{centreId}/subjects', [CentreController::class, 'syncSubjects']);
            Route::get('/{centreId}/academic-levels', [CentreController::class, 'academicLevels']);
            Route::put('/{centreId}/academic-levels', [CentreController::class, 'syncAcademicLevels']);
            Route::patch('/{centreId}/max-users', [CentreController::class, 'updateMaxUsers']);
        });

        // Packages
        Route::prefix('packages')->group(function () {
            Route::get('/', [PackagePlanController::class, 'index']);
            Route::post('/', [PackagePlanController::class, 'store']);
            Route::get('/{id}', [PackagePlanController::class, 'show']);
            Route::put('/{id}', [PackagePlanController::class, 'update']);
            Route::post('/{id}/duplicate', [PackagePlanController::class, 'duplicate']);
            Route::post('/{id}/archive', [PackagePlanController::class, 'archive']);
            Route::delete('/{id}', [PackagePlanController::class, 'destroy']);
        });

        // Centre invoices
        Route::prefix('invoices')->group(function () {
            Route::get('/', [CentreInvoiceController::class, 'index']);
            Route::post('/', [CentreInvoiceController::class, 'store']);
            Route::get('/{id}', [CentreInvoiceController::class, 'show']);
            Route::post('/{id}/mark-paid', [CentreInvoiceController::class, 'markPaid']);
            Route::post('/{id}/mark-unpaid', [CentreInvoiceController::class, 'markUnpaid']);
            Route::post('/{id}/cancel', [CentreInvoiceController::class, 'cancel']);
            Route::delete('/{id}', [CentreInvoiceController::class, 'destroy']);
        });
    });
});
