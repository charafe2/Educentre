<?php

namespace App\Domains\Students\Models;

use App\Domains\Core\Traits\BelongsToTenant;
use App\Domains\Planning\Models\CourseClass;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Enrollment extends Model
{
    use BelongsToTenant, HasFactory, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'student_id',
        'class_id',
        'group_id',
        'uuid',
        'enrolled_at',
        'status',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }
}
