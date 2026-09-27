<?php

namespace App\Domains\Planning\Models;

use App\Domains\Core\Traits\Auditable;
use App\Domains\Core\Traits\BelongsToTenant;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Teachers\Models\Teacher;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Group extends Model
{
    use BelongsToTenant, HasFactory, HasUuid, SoftDeletes, Auditable;

    protected static string $auditModule = 'Groupes';

    protected $fillable = [
        'tenant_id',
        'class_id',
        'uuid',
        'group_number',
        'max_capacity',
        'teacher_id',
        'room_id',
        'monthly_price',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:2',
    ];

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'group_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(ClassSession::class, 'group_id');
    }

    /** This group's own teacher, or its class's when the group has no override. */
    public function effectiveTeacherId(): ?int
    {
        return $this->teacher_id ?? $this->courseClass?->teacher_id;
    }

    public function effectiveRoomId(): ?int
    {
        return $this->room_id ?? $this->courseClass?->room_id;
    }

    public function effectiveMonthlyPrice(): ?float
    {
        return $this->monthly_price !== null ? (float) $this->monthly_price : $this->courseClass?->monthly_price;
    }

    public function auditLabel(): string
    {
        $className = $this->courseClass?->name ?? 'classe supprimée';

        return "Groupe {$this->group_number} ({$className})";
    }
}
