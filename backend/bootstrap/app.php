<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [
            \App\Domains\Core\Middleware\ResolveTenantMiddleware::class,
            \App\Domains\Core\Middleware\PreventApiResponseCaching::class,
        ]);
        $middleware->alias([
            'superadmin' => \App\Domains\Core\Middleware\EnsureSuperAdmin::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        // Deploy note: this only fires if `php artisan schedule:run` is
        // invoked every minute by cron/supervisor in the container — add
        // `* * * * * php artisan schedule:run >> /dev/null 2>&1` there.
        $schedule->command('students:check-at-risk')->daily();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
