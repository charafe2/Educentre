<?php

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    require base_path('app/Domains/Auth/routes.php');
    require base_path('app/Domains/Settings/routes.php');
    require base_path('app/Domains/Students/routes.php');
    require base_path('app/Domains/Planning/routes.php');
    require base_path('app/Domains/Teachers/routes.php');
});
