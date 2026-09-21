<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A "Netflix profile picker" account: several Tenants (centres) that share
 * one login email + password. `is_multitenant` is superadmin-controlled and
 * gates only the ability to add more centres — see AuthService::login for
 * why the login picker itself is driven by row count, not this flag.
 */
class AccountGroup extends Model
{
    use HasFactory, HasUuid;

    protected $fillable = [
        'uuid',
        'label',
        'is_multitenant',
    ];

    protected function casts(): array
    {
        return [
            'is_multitenant' => 'boolean',
        ];
    }

    public function tenants(): HasMany
    {
        return $this->hasMany(Tenant::class);
    }
}
