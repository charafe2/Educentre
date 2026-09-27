<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\TeacherPayment;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class TeacherPaymentService
{
    public function all(int $tenantId, ?string $month = null): Collection
    {
        return TeacherPayment::query()
            ->where('tenant_id', $tenantId)
            ->when($month, fn ($query, string $month) => $query->whereDate(
                'period_month',
                Carbon::createFromFormat('Y-m', $month)->startOfMonth(),
            ))
            ->get();
    }

    /** One row per teacher per month — a later mark-as-paid for the same month replaces (not duplicates) the record. */
    public function markAsPaid(int $tenantId, int $teacherId, string $month, float $amount, string $method): TeacherPayment
    {
        return TeacherPayment::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'teacher_id' => $teacherId,
                'period_month' => Carbon::createFromFormat('Y-m', $month)->startOfMonth(),
            ],
            [
                'amount' => $amount,
                'method' => $method,
                'paid_at' => now()->toDateString(),
            ],
        );
    }

    public function markAsUnpaid(int $tenantId, int $teacherId, string $month): void
    {
        TeacherPayment::query()
            ->where('tenant_id', $tenantId)
            ->where('teacher_id', $teacherId)
            ->whereDate('period_month', Carbon::createFromFormat('Y-m', $month)->startOfMonth())
            ->delete();
    }
}
