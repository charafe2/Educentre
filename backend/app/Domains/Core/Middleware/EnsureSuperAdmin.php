<?php

namespace App\Domains\Core\Middleware;

use App\Models\SuperAdmin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() instanceof SuperAdmin) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Accès réservé au super administrateur.',
                'errors' => null,
            ], 403);
        }

        return $next($request);
    }
}
