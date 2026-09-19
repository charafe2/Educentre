<?php

namespace App\Traits;

use Illuminate\Support\Str;

/**
 * Fills the model's uuid on insert.
 *
 * Every uuid column in this schema is NOT NULL with no database default, so a
 * model that lists 'uuid' as fillable but never sets it fails the insert with
 * a not-null violation (surfacing as a 500). The value is only generated when
 * one was not supplied, so callers that pass their own uuid keep working.
 */
trait HasUuid
{
    protected static function bootHasUuid(): void
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }
}
