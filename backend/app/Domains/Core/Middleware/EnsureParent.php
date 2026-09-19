<?php

namespace App\Domains\Core\Middleware;

use App\Domains\Students\Models\StudentParent;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureParent
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() instanceof StudentParent) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => "Accès réservé à l'espace parent.",
                'errors' => null,
            ], 403);
        }

        return $next($request);
    }
}
