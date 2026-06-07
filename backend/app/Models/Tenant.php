<?php

namespace App\Models;

use App\Domains\Core\Models\Centre;
use App\Domains\Finance\Models\Payment;
use Database\Factories\TenantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    /** @use HasFactory<TenantFactory> */
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (self $tenant) {
            if (empty($tenant->uuid)) {
                $tenant->uuid = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'uuid',
        'name',
        'slug',
        'domain',
        'settings',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'json',
            'uuid' => 'string',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function centre(): HasOne
    {
        return $this->hasOne(Centre::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
