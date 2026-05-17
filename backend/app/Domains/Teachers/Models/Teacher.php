<?php

namespace App\Domains\Teachers\Models;

use App\Models\Tenant;
use App\Models\User;
use App\Domains\Planning\Models\CourseClass;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'uuid',
        'specialty',
        'payment_mode',
        'fixed_monthly_salary',
        'rate_per_student',
        'min_students_threshold',
        'iban',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'fixed_monthly_salary' => 'decimal:2',
        'rate_per_student' => 'decimal:2',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(CourseClass::class, 'teacher_id');
    }
}
