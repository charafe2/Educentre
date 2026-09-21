<?php

namespace App\Domains\Core\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `auth:sanctum` alone only proves the token is valid — it doesn't say
 * which kind of principal it belongs to. Now that StudentParent (and
 * SuperAdmin) can also authenticate via Sanctum, every tenant-staff route
 * (students, teachers, groups, payments, ...) needs this on top of
 * auth:sanctum, or a parent/superadmin token can call it too.
 */
class EnsureStaffUser
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user instanceof User) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Accès non autorisé.',
                'errors' => null,
            ], 403);
        }

        // A pre-auth token issued mid centre-selection (abilities restricted
        // to `centre-select`, see AuthService::beginCentreSelection) must be
        // usable for nothing except POST /auth/select-centre, which sits
        // outside this middleware group on purpose. Every normal session
        // token has abilities:['*'], so this is a no-op for them.
        if (!$user->tokenCan('*')) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Veuillez sélectionner un centre pour continuer.',
                'errors' => null,
            ], 403);
        }

        return $next($request);
    }
}
