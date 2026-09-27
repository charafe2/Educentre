<?php

namespace App\Domains\Core\Traits;

use App\Domains\Core\Services\AuditLogService;
use App\Models\User;

/**
 * Writes an audit_logs entry on create/update/delete.
 *
 * The host model must define `protected static string $auditModule` and
 * implement `public function auditLabel(): string`. It may also define
 * `protected static array $auditIgnore = [...]` listing columns whose lone
 * change should NOT count as an audited "modification" — e.g. User lists
 * `last_login_at`, which Eloquent updates on every login and would otherwise
 * log a meaningless entry for it.
 *
 * Only fires when the acting user is an authenticated school User — console
 * commands, seeders, factories and queued jobs run with no authenticated
 * user, so they stay silent by design (see AuditLogService for the write
 * itself, which never throws).
 */
trait Auditable
{
    protected static function bootAuditable(): void
    {
        static::created(fn ($model) => static::recordAudit($model, 'creation'));
        static::updated(function ($model) {
            $ignored = property_exists(static::class, 'auditIgnore') ? static::$auditIgnore : [];
            $changed = array_diff(array_keys($model->getChanges()), $ignored, ['updated_at']);

            if ($changed !== []) {
                static::recordAudit($model, 'modification');
            }
        });
        static::deleted(fn ($model) => static::recordAudit($model, 'suppression'));
    }

    protected static function recordAudit($model, string $action): void
    {
        $actor = auth()->user();

        if (!$actor instanceof User || empty($model->tenant_id)) {
            return;
        }

        app(AuditLogService::class)->record(
            tenantId: $model->tenant_id,
            actor: $actor,
            module: static::$auditModule,
            action: $action,
            description: $model->auditLabel(),
        );
    }
}
