<?php

namespace App\Domains\Core\Models;

use Database\Factories\PackagePlanFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PackagePlan extends Model
{
    use HasFactory, SoftDeletes;

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

    // Model lives outside App\Models, so Laravel's default factory-name
    // convention (App\ -> Database\Factories\) can't find it. Point at it
    // explicitly.
    protected static function newFactory(): PackagePlanFactory
    {
        return PackagePlanFactory::new();
    }
}
