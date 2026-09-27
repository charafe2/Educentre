<?php

namespace App\Domains\Core\Models;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    /**
     * Immutable log: no `updated_at` column to manage.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'actor_id',
        'actor_name',
        'module',
        'action',
        'description',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
