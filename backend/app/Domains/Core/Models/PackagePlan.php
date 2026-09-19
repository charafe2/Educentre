<?php

namespace App\Domains\Core\Models;

use Database\Factories\PackagePlanFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PackagePlan extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_ARCHIVED = 'archived';

    public const STATUSES = [self::STATUS_ACTIVE, self::STATUS_DRAFT, self::STATUS_ARCHIVED];

    public const SUPPORT_LEVELS = ['Standard', 'Prioritaire', 'Dédié'];

    protected $fillable = [
        'uuid', 'name', 'monthly_price', 'users_limit',
        'students_limit', 'storage_gb', 'support_level', 'status', 'features',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
        'features' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $plan) {
            if (empty($plan->uuid)) {
                $plan->uuid = (string) Str::uuid();
            }
        });
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(CentreInvoice::class);
    }

    /** True once the plan has been billed — deleting it would strand history. */
    public function isInUse(): bool
    {
        return $this->invoices()->withTrashed()->exists();
    }

    public function scopeWithStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->where('name', 'like', '%'.$term.'%');
    }

    // Model lives outside App\Models, so Laravel's default factory-name
    // convention (App\ -> Database\Factories\) can't find it. Point at it
    // explicitly.
    protected static function newFactory(): PackagePlanFactory
    {
        return PackagePlanFactory::new();
    }
}
