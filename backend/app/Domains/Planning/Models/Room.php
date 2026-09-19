<?php

namespace App\Domains\Planning\Models;

use App\Domains\Core\Traits\BelongsToTenant;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Room extends Model
{
    use BelongsToTenant, HasFactory, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'uuid',
        'name',
        'capacity',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function classes(): HasMany
    {
        return $this->hasMany(CourseClass::class, 'room_id');
    }
}
