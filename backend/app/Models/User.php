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

    public function auditLabel(): string
    {
        return "{$this->name} ({$this->role})";
    }
}
