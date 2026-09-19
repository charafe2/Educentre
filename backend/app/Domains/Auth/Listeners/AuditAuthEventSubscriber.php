<?php

namespace App\Domains\Auth\Listeners;

use App\Domains\Auth\Events\UserLoggedIn;
use App\Domains\Auth\Events\UserLoggedOut;
use App\Domains\Core\Services\AuditLogService;
use App\Models\User;
use Illuminate\Events\Dispatcher;

/**
 * Writes an audit_logs entry for every login/logout, under the
 * 'Authentification' module.
 */
class AuditAuthEventSubscriber
{
    public function __construct(private readonly AuditLogService $auditLog) {}

    public function handleLogin(UserLoggedIn $event): void
    {
        $this->record($event->user, 'connexion', "Connexion de {$event->user->name}");
    }

    public function handleLogout(UserLoggedOut $event): void
    {
        $this->record($event->user, 'deconnexion', "Déconnexion de {$event->user->name}");
    }

    private function record(User $user, string $action, string $description): void
    {
        $this->auditLog->record(
            tenantId: $user->tenant_id,
            actor: $user,
            module: 'Authentification',
            action: $action,
            description: $description,
        );
    }

    public function subscribe(Dispatcher $events): array
    {
        return [
            UserLoggedIn::class => 'handleLogin',
            UserLoggedOut::class => 'handleLogout',
        ];
    }
}
