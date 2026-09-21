<?php

namespace App\Domains\Auth\Services;

use App\Domains\Auth\DTOs\LoginDTO;
use App\Domains\Auth\Events\UserLoggedIn;
use App\Domains\Core\Models\Centre;
use App\Domains\Core\Scopes\TenantScope;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class AuthService
{
    public function changePassword(User $user, string $newPassword): void
    {
        $hashed = Hash::make($newPassword);

        $user->update(['password' => $hashed]);

        $this->propagateToSiblings($user, $hashed);
    }

    public function verifyPassword(string $email, string $password): bool
    {
        $user = User::where('email', $email)->first();

        return $user !== null && Hash::check($password, $user->password);
    }

    /**
     * Multiple rows can now share an email (a multitenant account's owner
     * rows, one per centre — see 2026_09_21_000003 migration), so this looks
     * up every candidate and checks the password against each rather than
     * assuming a single row. Every existing single-centre account still has
     * exactly one candidate, so this is behavior-identical for them.
     */
    public function login(LoginDTO $dto, string $throttleKey): array
    {
        $candidates = User::where('email', $dto->email)->orderBy('id')->get();

        $user = $candidates->first(fn (User $u) => Hash::check($dto->password, $u->password));

        if ($user === null) {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Email ou mot de passe incorrect.');
        }

        if ($user->status !== 'active') {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Ce compte n\'est pas actif.');
        }

        RateLimiter::clear($throttleKey);

        $siblings = $user->siblingOwnerAccounts();

        return $siblings->isEmpty()
            ? $this->completeLogin($user)
            : $this->beginCentreSelection($user, $siblings);
    }

    /**
     * Step 2 of a multitenant login. `$preAuthUser` is `$request->user()` as
     * resolved from the short-lived, ability-restricted token minted in
     * `beginCentreSelection()` — that resolution IS the re-verification that
     * the requester actually authenticated as this account; we never trust
     * a bare tenant/centre id on its own.
     */
    public function selectCentre(User $preAuthUser, string $centreUuid): array
    {
        $groupId = $preAuthUser->tenant?->account_group_id;

        if (! $groupId) {
            throw new AuthenticationException('Ce compte ne fait pas partie d\'un groupe multi-centres.');
        }

        $centre = Centre::withoutGlobalScope(TenantScope::class)
            ->where('uuid', $centreUuid)
            ->whereHas('tenant', fn ($q) => $q->where('account_group_id', $groupId))
            ->first();

        if ($centre === null) {
            throw new AuthenticationException('Ce centre ne fait pas partie de votre compte.');
        }

        $targetOwner = User::withoutGlobalScope(TenantScope::class)
            ->where('tenant_id', $centre->tenant_id)
            ->where('email', $preAuthUser->email)
            ->where('is_owner', true)
            ->first();

        if ($targetOwner === null) {
            throw new AuthenticationException('Ce centre ne fait pas partie de votre compte.');
        }

        // One-time use.
        $preAuthUser->currentAccessToken()->delete();

        return $this->completeLogin($targetOwner);
    }

    private function completeLogin(User $user): array
    {
        $token = $user->createToken('auth-token', ['*'], now()->addDays(7))->plainTextToken;

        $user->update(['last_login_at' => now()]);

        UserLoggedIn::dispatch($user);

        return [
            'status' => 'authenticated',
            'user' => $user,
            'token' => $token,
        ];
    }

    /**
     * A real, revocable Sanctum token (restricted to the `centre-select`
     * ability, 10-minute TTL) rather than a self-signed blob: it's a
     * genuinely authenticated principal (satisfies "re-verify the requester
     * actually authenticated as this account"), it expires and can be
     * deleted after use, and it reuses infrastructure this app already
     * trusts instead of a new crypto path. EnsureStaffUser blocks it from
     * every other route (see that middleware).
     */
    private function beginCentreSelection(User $user, Collection $siblings): array
    {
        $preAuthToken = $user->createToken('centre-select-token', ['centre-select'], now()->addMinutes(10))
            ->plainTextToken;

        $tenantIds = $siblings->push($user)->pluck('tenant_id');

        $centres = Centre::withoutGlobalScope(TenantScope::class)
            ->whereIn('tenant_id', $tenantIds)
            ->with('tenant')
            ->orderBy('name')
            ->get();

        return [
            'status' => 'centre_selection_required',
            'preAuthToken' => $preAuthToken,
            'accountName' => $user->name,
            'centres' => $centres,
        ];
    }

    /**
     * Keeps every sibling owner row's credentials consistent with the one
     * that was just changed — otherwise changing your password from inside
     * one centre locks you out of every other centre in the account. Raw
     * update, same precedent (and same reason: avoid re-validating an
     * already-valid hash against today's configured hashing driver) as
     * SettingsUsersController::store() copying the owner's password onto a
     * new staff row.
     */
    private function propagateToSiblings(User $user, string $hashedPassword): void
    {
        if (! $user->is_owner) {
            return;
        }

        $siblingIds = $user->siblingOwnerAccounts()->pluck('id');

        if ($siblingIds->isNotEmpty()) {
            DB::table('users')->whereIn('id', $siblingIds)->update(['password' => $hashedPassword]);
        }
    }
}
