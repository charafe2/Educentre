<?php

namespace App\Domains\Planning\Models;

use App\Domains\Core\Traits\Auditable;
use App\Domains\Core\Traits\BelongsToTenant;
use App\Domains\Students\Models\Enrollment;
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
    ];

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'group_id');
    }

    public function auditLabel(): string
    {
        $className = $this->courseClass?->name ?? 'classe supprimée';

        return "Groupe {$this->group_number} ({$className})";
    }
}
