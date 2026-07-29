<?php

namespace App\Domains\Settings\Controllers;

use App\Domains\Auth\Resources\UserResource;
use App\Domains\Settings\Requests\StoreSettingsUserRequest;
use App\Domains\Settings\Requests\UpdateSettingsUserRequest;
use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'SettingsUsers', description: "Gestion des utilisateurs du centre (Paramètres > Utilisateurs)")]
class SettingsUsersController extends Controller
{
    #[OA\Get(
        path: '/settings/users',
        summary: "Lister les utilisateurs du centre",
        security: [['sanctum' => []]],
        tags: ['SettingsUsers'],
    )]
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        $users = User::where('tenant_id', $tenant->id)
            ->orderByDesc('is_owner')
            ->orderBy('name')
            ->get();

        return $this->success(
            data: UserResource::collection($users),
            meta: [
                'usersCount' => $users->count(),
                'maxUsers' => $tenant->max_users,
            ],
        );
    }

    #[OA\Post(
        path: '/settings/users',
        summary: "Ajouter un utilisateur au centre (réservé au propriétaire)",
        security: [['sanctum' => []]],
        tags: ['SettingsUsers'],
    )]
    public function store(StoreSettingsUserRequest $request): JsonResponse
    {
        $owner = $request->user();

        if (! $owner->is_owner) {
            return $this->error("Seul le propriétaire du centre peut ajouter des utilisateurs.", null, 403);
        }

        $tenant = Tenant::findOrFail($owner->tenant_id);
        $usersCount = User::where('tenant_id', $tenant->id)->count();

        if ($usersCount >= $tenant->max_users) {
            return $this->error(
                "Limite d'utilisateurs atteinte ({$usersCount}/{$tenant->max_users}). Contactez le support pour l'augmenter.",
                null,
                422,
            );
        }

        $validated = $request->validated();

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            // Throwaway value, immediately overwritten below — see comment there.
            'password' => Str::random(40),
            'role' => 'Collaborateur',
            'status' => 'active',
            'is_owner' => false,
            'permissions' => $validated['permissions'],
        ]);

        // Copy the owner's already-hashed password as-is via a raw update,
        // bypassing Eloquent's `hashed` cast on purpose: that cast calls
        // Hash::verifyConfiguration() against the *currently configured*
        // hashing driver and throws ("Could not verify the hashed value's
        // configuration") if the stored hash's algorithm doesn't match it —
        // which happens whenever the app's default driver differs from
        // whatever algorithm actually produced this hash (e.g. a hosting
        // environment where argon2 support differs from wherever the
        // account was originally created). We already know this hash is
        // valid — it authenticates the owner on every login — so it needs
        // to be stored verbatim, not re-validated against today's config.
        DB::table('users')->where('id', $user->id)->update(['password' => $owner->password]);
        $user->refresh();

        return $this->success(
            data: UserResource::make($user),
            message: 'Utilisateur ajouté.',
            code: 201,
        );
    }

    #[OA\Put(
        path: '/settings/users/{uuid}',
        summary: "Modifier le nom et les permissions d'un utilisateur",
        security: [['sanctum' => []]],
        tags: ['SettingsUsers'],
    )]
    public function update(string $uuid, UpdateSettingsUserRequest $request): JsonResponse
    {
        $owner = $request->user();

        if (! $owner->is_owner) {
            return $this->error("Seul le propriétaire du centre peut modifier les utilisateurs.", null, 403);
        }

        $user = User::where('tenant_id', $owner->tenant_id)->where('uuid', $uuid)->firstOrFail();

        if ($user->is_owner) {
            return $this->error("Les permissions du propriétaire ne peuvent pas être modifiées.", null, 403);
        }

        $validated = $request->validated();
        $user->update([
            'name' => $validated['name'],
            'permissions' => $validated['permissions'],
        ]);

        return $this->success(
            data: UserResource::make($user->fresh()),
            message: 'Utilisateur mis à jour.',
        );
    }

    #[OA\Delete(
        path: '/settings/users/{uuid}',
        summary: "Supprimer un utilisateur du centre",
        security: [['sanctum' => []]],
        tags: ['SettingsUsers'],
    )]
    public function destroy(string $uuid, Request $request): JsonResponse
    {
        $owner = $request->user();

        if (! $owner->is_owner) {
            return $this->error("Seul le propriétaire du centre peut supprimer des utilisateurs.", null, 403);
        }

        $user = User::where('tenant_id', $owner->tenant_id)->where('uuid', $uuid)->firstOrFail();

        if ($user->is_owner) {
            return $this->error("Le propriétaire du centre ne peut pas être supprimé.", null, 403);
        }

        $user->delete();

        return $this->success(message: 'Utilisateur supprimé.');
    }
}
