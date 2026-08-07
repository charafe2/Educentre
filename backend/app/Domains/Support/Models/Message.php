<?php

namespace App\Domains\Support\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Message extends Model
{
    protected $fillable = [
        'uuid',
        'conversation_id',
        'sender_type',
        'sender_id',
        'content',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): \Illuminate\Database\Eloquent\Relations\MorphTo
    {
        return $this->morphTo();
    }
}
