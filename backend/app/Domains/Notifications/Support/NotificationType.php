<?php

namespace App\Domains\Notifications\Support;

/**
 * Central registry of known notification type strings. Adding a future
 * notification type (teacher salary paid, class created, etc.) means adding
 * one constant here and one dispatch method on NotificationService — nothing
 * else in the app should hardcode these strings.
 */
final class NotificationType
{
    public const PAYMENT_RECEIVED = 'payment_received';
    public const STUDENT_REGISTERED = 'student_registered';
    public const STUDENT_AT_RISK = 'student_at_risk';

    public static function all(): array
    {
        return [
            self::PAYMENT_RECEIVED,
            self::STUDENT_REGISTERED,
            self::STUDENT_AT_RISK,
        ];
    }
}
