<?php

namespace App\Providers;

use App\Domains\Notifications\Contracts\PushProvider;
use App\Domains\Notifications\Providers\ExpoPushProvider;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PushProvider::class, ExpoPushProvider::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
