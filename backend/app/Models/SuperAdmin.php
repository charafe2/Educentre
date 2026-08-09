<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class SuperAdmin extends Authenticatable
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (self $superAdmin) {
            if (empty($superAdmin->uuid)) {
                $superAdmin->uuid = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'uuid',
        'name',
        'email',
        'password',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /** The two-value status the console speaks. */
    public function status(): string
    {
        return $this->is_active ? 'active' : 'suspended';
    }

    /**
     * Drops every issued token.
     *
     * Suspending or deleting an operator has to end their live sessions too —
     * a Sanctum token outlives the account state that granted it.
     */
    public function revokeAllTokens(): void
    {
        $this->tokens()->delete();
    }
}
