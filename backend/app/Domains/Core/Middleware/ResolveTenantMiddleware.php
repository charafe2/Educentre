<?php

namespace App\Domains\Core\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

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
