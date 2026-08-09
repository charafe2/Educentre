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
        $user = $request->user();

        if (!$user instanceof SuperAdmin) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Accès réservé au super administrateur.',
                'errors' => null,
            ], 403);
        }

        // Tokens are revoked on suspension, but a request already in flight — or
        // a token missed by a failed revoke — must not slip through.
        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Ce compte est suspendu.',
                'errors' => null,
            ], 403);
        }

        return $next($request);
    }
}
