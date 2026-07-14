<?php

namespace App\Domains\SuperAdmin\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class PackagePlan extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'monthly_price',
        'users_limit',
        'students_limit',
        'storage_gb',
        'support_level',
        'status',
        'features',
    ];

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'users_limit' => 'integer',
            'students_limit' => 'integer',
            'storage_gb' => 'integer',
            'features' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $packagePlan) {
            if (empty($packagePlan->uuid)) {
                $packagePlan->uuid = (string) Str::uuid();
            }
        });
    }
}
