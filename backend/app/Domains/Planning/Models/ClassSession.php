<?php

namespace App\Domains\Planning\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClassSession extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'class_id',
        'uuid',
        'day',
        'start_hour',
        'end_hour',
        'is_cancelled',
        'cancel_reason',
    ];

    protected $casts = [
        'day' => 'integer',
        'start_hour' => 'integer',
        'end_hour' => 'integer',
        'is_cancelled' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function class(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(SessionAttendance::class, 'class_session_id');
    }
}
