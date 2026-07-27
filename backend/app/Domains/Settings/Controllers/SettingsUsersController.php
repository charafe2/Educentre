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
            // Copies the owner's already-hashed password as-is (the `hashed`
            // cast on User::password only re-hashes values that aren't already
            // a valid hash, see Illuminate\Database\Eloquent\Concerns\HasAttributes::
            // castAttributeAsHashedString) — the new user logs in with the exact
            // same password as the owner, by design.
            'password' => $owner->password,
            'role' => 'Collaborateur',
            'status' => 'active',
            'is_owner' => false,
            'permissions' => $validated['permissions'],
        ]);

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
