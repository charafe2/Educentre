<?php

namespace App\Domains\Planning\Models;

use App\Domains\Students\Models\Student;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SessionAttendance extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (self $attendance) {
            $attendance->attended_on ??= now()->toDateString();
        });
    }

    protected $fillable = [
        'tenant_id',
        'class_session_id',
        'student_id',
        'attended_on',
        'uuid',
        'status',
        'notes',
    ];

    protected $casts = [
        'attended_on' => 'date',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(ClassSession::class, 'class_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
