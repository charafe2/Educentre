<?php

namespace App\Domains\Core\Services;

use App\Domains\Core\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

class AuditLogService
{
    /**
     * Record one audit entry. Never throws: a failure to write an audit row
     * must not break the business action that triggered it (a payment must
     * still be created even if this insert fails for some reason).
     */
    public function record(int $tenantId, ?User $actor, string $module, string $action, string $description): void
    {
        try {
            AuditLog::create([
                'tenant_id' => $tenantId,
                'actor_id' => $actor?->id,
                'actor_name' => $actor?->name ?? 'Système',
                'module' => $module,
                'action' => $action,
                'description' => $description,
            ]);
        } catch (Throwable $e) {
            Log::error('Échec de l\'écriture du journal d\'audit.', [
                'tenant_id' => $tenantId,
                'module' => $module,
                'action' => $action,
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
