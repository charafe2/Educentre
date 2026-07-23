<?php

namespace App\Domains\Notifications\Services;

use App\Domains\Finance\Models\Payment;
use App\Domains\Notifications\Models\Notification;
use App\Domains\Notifications\Support\NotificationType;
use App\Domains\Students\Models\Student;
use App\Events\NotificationCreated;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Single centralized entry point for creating notifications. Controllers and
 * services never build a Notification row directly — they call one of the
 * `notifyX()` methods here. Adding a new notification type later means
 * adding one constant to NotificationType and one method here, not touching
 * every place that could trigger it.
 */
class NotificationService
{
    public function __construct(private readonly PushNotificationService $push) {}

    public function paginate(int $tenantId, int $userId, array $filters = []): LengthAwarePaginator
    {
        return Notification::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->when(($filters['unread_only'] ?? false), fn ($query) => $query->unread())
            ->orderByDesc('created_at')
            ->paginate(
                perPage: max(1, min(50, (int) ($filters['per_page'] ?? 15))),
                page: max(1, (int) ($filters['page'] ?? 1))
            );
    }

    public function unreadCount(int $tenantId, int $userId): int
    {
        return Notification::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->unread()
            ->count();
    }

    public function markAsRead(int $tenantId, int $userId, int $id): void
    {
        $notification = Notification::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->findOrFail($id);

        $notification->markAsRead();
    }

    public function markAllAsRead(int $tenantId, int $userId): void
    {
        Notification::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->unread()
            ->update(['read_at' => now()]);
    }

    public function delete(int $tenantId, int $userId, int $id): void
    {
        Notification::query()
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->findOrFail($id)
            ->delete();
    }

    public function notifyPaymentReceived(Payment $payment): void
    {
        $student = $payment->student;
        if ($student === null) {
            return;
        }

        $this->notifyTenantStaff(
            tenantId: $payment->tenant_id,
            type: NotificationType::PAYMENT_RECEIVED,
            title: 'Paiement reçu',
            message: "{$student->first_name} {$student->last_name} a effectué le paiement de ce mois.",
            relatedEntityType: 'student',
            relatedEntityId: $student->id,
        );
    }

    public function notifyStudentRegistered(Student $student): void
    {
        $this->notifyTenantStaff(
            tenantId: $student->tenant_id,
            type: NotificationType::STUDENT_REGISTERED,
            title: 'Nouvel élève inscrit',
            message: "Un nouvel élève a été inscrit : {$student->first_name} {$student->last_name}.",
            relatedEntityType: 'student',
            relatedEntityId: $student->id,
        );
    }

    public function notifyStudentAtRisk(Student $student): void
    {
        // Avoid re-notifying the same at-risk student every time the check
        // runs (reactive on attendance + daily sweep) — one open notification
        // per student is enough until it's read.
        $alreadyNotified = Notification::query()
            ->where('tenant_id', $student->tenant_id)
            ->where('type', NotificationType::STUDENT_AT_RISK)
            ->where('related_entity_type', 'student')
            ->where('related_entity_id', $student->id)
            ->whereNull('read_at')
            ->exists();

        if ($alreadyNotified) {
            return;
        }

        $this->notifyTenantStaff(
            tenantId: $student->tenant_id,
            type: NotificationType::STUDENT_AT_RISK,
            title: 'Élève à risque de décrochage',
            message: "{$student->first_name} {$student->last_name} a été identifié(e) comme étant à risque de décrochage.",
            relatedEntityType: 'student',
            relatedEntityId: $student->id,
        );
    }

    /**
     * Core dispatch: persists one row per tenant staff member, broadcasts,
     * and pushes. All notifyX() methods above funnel through this.
     */
    private function notifyTenantStaff(
        int $tenantId,
        string $type,
        string $title,
        string $message,
        ?string $relatedEntityType = null,
        ?int $relatedEntityId = null,
    ): void {
        $recipients = User::query()->where('tenant_id', $tenantId)->get();

        foreach ($recipients as $recipient) {
            $this->create($tenantId, $recipient, $type, $title, $message, $relatedEntityType, $relatedEntityId);
        }
    }

    private function create(
        int $tenantId,
        User $recipient,
        string $type,
        string $title,
        string $message,
        ?string $relatedEntityType,
        ?int $relatedEntityId,
    ): Notification {
        $notification = Notification::create([
            'tenant_id' => $tenantId,
            'user_id' => $recipient->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'related_entity_type' => $relatedEntityType,
            'related_entity_id' => $relatedEntityId,
        ]);

        event(new NotificationCreated($notification));

        $this->push->sendToUser($recipient, $title, $message, [
            'type' => $type,
            'relatedEntityType' => $relatedEntityType,
            'relatedEntityId' => $relatedEntityId,
        ]);

        return $notification;
    }
}
