<?php

namespace App\Domains\Core\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Binds the authenticated user's tenant_id into the container so
 * TenantScope (see App\Domains\Core\Scopes\TenantScope) can scope every
 * BelongsToTenant model query to it.
 *
 * SECURITY NOTE: this relies on the container being torn down and rebuilt
 * fresh for every request, which is true today (plain PHP-FPM / `artisan
 * serve`, no Octane). If this app ever adopts Laravel Octane, Swoole, or
 * RoadRunner, `app()->instance()` bindings persist across requests handled
 * by the same worker — a request that doesn't hit this binding (e.g. an
 * unauthenticated route served by a worker that just handled an
 * authenticated one) would silently inherit the PREVIOUS request's
 * tenant_id. Re-audit this file before adopting any of those.
 */
class ResolveTenantMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // For API routes, if the user is authenticated, we bind their tenant_id to the container.
        if (auth()->check() && auth()->user()->tenant_id) {
            app()->instance('tenant_id', auth()->user()->tenant_id);
        } elseif ($request->route('tenant')) {
            // Fallback for public routes if tenant is in URL
            // E.g. /api/v1/{tenant}/public-info
            // $tenant = Tenant::where('slug', $request->route('tenant'))->firstOrFail();
            // app()->instance('tenant_id', $tenant->id);
        }

        return $next($request);
    }
}
