<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use App\Domains\Core\Models\Centre;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

use App\Domains\Core\Traits\Auditable;
use App\Domains\Core\Traits\BelongsToTenant;
use App\Domains\Core\Scopes\TenantScope;
use Illuminate\Support\Collection;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, BelongsToTenant, Auditable;

    /**
     * Module label under which this model's CRUD is audited.
     */
    protected static string $auditModule = 'Utilisateurs';

    /**
     * `last_login_at` is touched by Eloquent on every login (see
     * AuthService::login) — on its own it must not count as an audited
     * "modification" of the user record.
     */
    protected static array $auditIgnore = ['last_login_at'];

    protected static function booted(): void
    {
        static::creating(function (self $user) {
            if (empty($user->uuid)) {
                $user->uuid = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'tenant_id',
        'uuid',
        'name',
        'email',
        'password',
        'role',
        'status',
        'avatar_url',
        'last_login_at',
        'is_owner',
        'permissions',
    ];

    protected $hidden = [
        'id',
        'tenant_id',
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_owner' => 'boolean',
            'permissions' => 'array',
        ];
    }

    

    public function centre(): HasOne
    {
        return $this->hasOne(Centre::class, 'tenant_id', 'tenant_id');
    }

    /**
     * Other owner rows (different tenants, same account group) sharing this
     * row's login email — empty for every normal single-centre account.
     * Explicitly bypasses TenantScope: once ResolveTenantMiddleware has
     * bound this row's own tenant_id into the container, the scope would
     * otherwise hide every sibling from this exact query.
     */
    public function siblingOwnerAccounts(): Collection
    {
        $groupId = $this->tenant?->account_group_id;

        if (! $groupId) {
            return collect();
        }

        return static::withoutGlobalScope(TenantScope::class)
            ->where('email', $this->email)
            ->where('is_owner', true)
            ->where('id', '!=', $this->id)
            ->whereHas('tenant', fn ($q) => $q->where('account_group_id', $groupId))
            ->get();
    }

    public function auditLabel(): string
    {
        return "{$this->name} ({$this->role})";
    }
}
