<?php

use App\Domains\SuperAdmin\Controllers\CentreInvoiceController;
use App\Domains\SuperAdmin\Controllers\PackagePlanController;
use App\Domains\SuperAdmin\Controllers\SuperAdminAccountController;
use App\Domains\SuperAdmin\Controllers\SuperAdminAuthController;
use App\Domains\SuperAdmin\Controllers\SuperAdminCentreController;
use App\Domains\SuperAdmin\Controllers\SuperAdminOverviewController;
use Illuminate\Support\Facades\Route;

Route::prefix('superadmin')->group(function () {
    Route::post('auth/login', [SuperAdminAuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [SuperAdminAuthController::class, 'me']);
        Route::post('auth/logout', [SuperAdminAuthController::class, 'logout']);

        Route::get('overview', SuperAdminOverviewController::class);

        Route::get('centres', [SuperAdminCentreController::class, 'index']);
        Route::post('centres', [SuperAdminCentreController::class, 'store']);
        Route::put('centres/{centre}', [SuperAdminCentreController::class, 'update']);
        Route::post('centres/{centre}/toggle-status', [SuperAdminCentreController::class, 'toggleStatus']);
        Route::delete('centres/{centre}', [SuperAdminCentreController::class, 'destroy']);


        Route::get('accounts', [SuperAdminAccountController::class, 'index']);
        Route::post('accounts', [SuperAdminAccountController::class, 'store']);
        Route::put('accounts/{account}', [SuperAdminAccountController::class, 'update']);
        Route::post('accounts/{account}/toggle-status', [SuperAdminAccountController::class, 'toggleStatus']);
        Route::delete('accounts/{account}', [SuperAdminAccountController::class, 'destroy']);

        Route::get('invoices', [CentreInvoiceController::class, 'index']);
        Route::post('invoices', [CentreInvoiceController::class, 'store']);
        Route::post('invoices/{invoice}/mark-paid', [CentreInvoiceController::class, 'markPaid']);
        Route::delete('invoices/{invoice}', [CentreInvoiceController::class, 'destroy']);

        Route::get('packages', [PackagePlanController::class, 'index']);
        Route::post('packages', [PackagePlanController::class, 'store']);
        Route::put('packages/{packagePlan}', [PackagePlanController::class, 'update']);
        Route::delete('packages/{packagePlan}', [PackagePlanController::class, 'destroy']);
    });
});
