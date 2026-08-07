<?php

namespace App\Domains\Support\Models;

use App\Models\User;
use App\Domains\Core\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Conversation extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'uuid',
        'tenant_id',
        'user_id',
        'agent_id',
        'status',
        'subject',
        'internal_notes',
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(\App\Models\SuperAdmin::class, 'agent_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
