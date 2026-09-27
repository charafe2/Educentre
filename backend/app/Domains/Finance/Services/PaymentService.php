<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Payment;
use App\Domains\Notifications\Services\NotificationService;
use App\Domains\Planning\Models\CourseClass;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class PaymentService
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function all(int $tenantId): Collection
    {
        return Payment::query()
            ->where('tenant_id', $tenantId)
            ->orderByDesc('period_month')
            ->orderByDesc('created_at')
            ->get();
    }

    public function paginate(int $tenantId, array $filters = []): LengthAwarePaginator
    {
        return $this->query($tenantId, $filters)
            ->paginate(
                perPage: $this->perPage($filters['per_page'] ?? null),
                page: max(1, (int) ($filters['page'] ?? 1))
            );
    }

    /**
     * The per-status breakdown must ignore any `status` filter, or it
     * self-cannibalizes: e.g. with `status=pending` applied, the base query
     * already excludes everything that isn't pending, so `where('status',
     * 'paid')` on top of that can never match anything — `paidCount`/
     * `totalPaid` would read 0 forever regardless of how many payments are
     * actually paid. `month` stays applied since "totals for this month"
     * is still the right scope for the stat tiles.
     */
    public function summary(int $tenantId, array $filters = []): array
    {
        $payments = $this->query($tenantId, array_diff_key($filters, ['status' => null]))->reorder();

        return [
            'totalPaid' => (float) (clone $payments)->where('status', 'paid')->sum('amount'),
            'totalPending' => (float) (clone $payments)->where('status', 'pending')->sum('amount'),
            'totalPartial' => (float) (clone $payments)->where('status', 'partial')->sum('amount'),
            'totalOverdue' => (float) (clone $payments)->where('status', 'overdue')->sum('amount'),
            'paidCount' => (clone $payments)->where('status', 'paid')->count(),
            'pendingCount' => (clone $payments)->where('status', 'pending')->count(),
            'partialCount' => (clone $payments)->where('status', 'partial')->count(),
            'overdueCount' => (clone $payments)->where('status', 'overdue')->count(),
            'totalCount' => (clone $payments)->count(),
        ];
    }

    public function create(int $tenantId, array $data): Payment
    {
        return Payment::create(['tenant_id' => $tenantId, ...$this->attributes($data)]);
    }

    public function update(int $tenantId, int $id, array $data): Payment
    {
        $payment = $this->findForTenant($tenantId, $id);
        $payment->update($this->attributes($data, $payment));

        return $payment->refresh();
    }

    public function markAsPaid(int $tenantId, int $id, array $data): Payment
    {
        $payment = $this->findForTenant($tenantId, $id);
        $payment->update([
            'status' => 'paid',
            // Fully paid means amount_paid catches up to amount, regardless
            // of whether this payment was previously pending or partial.
            'amount_paid' => $payment->amount,
            'method' => $data['method'],
            'paid_at' => $data['paidAt'] ?? now()->toDateString(),
        ]);

        $payment->refresh();
        $this->notificationService->notifyPaymentReceived($payment);

        return $payment;
    }

    public function delete(int $tenantId, int $id): void
    {
        $this->findForTenant($tenantId, $id)->delete();
    }

    /**
     * Creates one Payment per class for a brand-new enrollment, splitting
     * the (possibly discounted) total and whatever's already been paid
     * proportionally by each class's own share of the raw (undiscounted)
     * total — the last class absorbs the rounding remainder so the rows
     * always sum to exactly $customTotal. Every row gets the same status:
     * this is one enrollment-time decision, not a per-class one.
     */
    public function createForEnrollment(
        int $tenantId,
        int $studentId,
        array $classIds,
        ?float $customTotal,
        string $paymentStatus,
        ?float $amountPaid,
    ): void {
        $ids = array_values(array_unique($classIds));
        if (empty($ids)) {
            return;
        }

        $classes = CourseClass::query()->where('tenant_id', $tenantId)->whereIn('id', $ids)->get()->keyBy('id');
        $rawTotal = (float) $classes->sum('monthly_price');
        if ($rawTotal <= 0) {
            return;
        }

        $total = $customTotal ?? $rawTotal;
        $paid = match ($paymentStatus) {
            'paid' => $total,
            'partial' => min(max($amountPaid ?? 0, 0), $total),
            default => 0.0,
        };

        $periodMonth = now()->startOfMonth();
        $remainingAmount = $total;
        $remainingPaid = $paid;
        $count = count($ids);

        foreach ($ids as $index => $classId) {
            $class = $classes->get($classId);
            if ($class === null) {
                continue;
            }

            $isLast = $index === $count - 1;
            $share = $isLast ? $remainingAmount : round($total * ((float) $class->monthly_price / $rawTotal), 2);
            $sharePaid = $isLast ? $remainingPaid : round($paid * ((float) $class->monthly_price / $rawTotal), 2);
            $remainingAmount -= $share;
            $remainingPaid -= $sharePaid;

            Payment::create([
                'tenant_id' => $tenantId,
                'student_id' => $studentId,
                'class_id' => $classId,
                'period_month' => $periodMonth,
                'amount' => $share,
                'amount_paid' => $sharePaid,
                'status' => $paymentStatus,
                'method' => $sharePaid > 0 ? 'Espèces' : null,
                'paid_at' => $sharePaid > 0 ? now()->toDateString() : null,
            ]);
        }
    }

    private function findForTenant(int $tenantId, int $id): Payment
    {
        return Payment::query()->where('tenant_id', $tenantId)->findOrFail($id);
    }

    private function query(int $tenantId, array $filters)
    {
        return Payment::query()
            ->where('tenant_id', $tenantId)
            ->when($filters['month'] ?? null, function ($query, string $month) {
                $query->whereDate('period_month', Carbon::createFromFormat('Y-m', $month)->startOfMonth());
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->orderByDesc('period_month')
            ->orderByDesc('created_at');
    }

    private function attributes(array $data, ?Payment $payment = null): array
    {
        $status = $data['status'] ?? $payment?->status ?? 'pending';
        $amount = $data['amount'] ?? $payment?->amount;
        $amountPaid = match (true) {
            $status === 'paid' => $amount,
            array_key_exists('amountPaid', $data) => $data['amountPaid'],
            $status === 'partial' => $payment?->amount_paid ?? 0,
            default => 0,
        };
        $hasReceivedMoney = $status === 'paid' || ($status === 'partial' && $amountPaid > 0);

        $paidAt = array_key_exists('paidAt', $data) ? $data['paidAt'] : $payment?->paid_at;
        if ($hasReceivedMoney && $paidAt === null) {
            $paidAt = now()->toDateString();
        } elseif (!$hasReceivedMoney) {
            $paidAt = null;
        }

        return [
            'student_id' => $data['studentId'] ?? $payment?->student_id,
            'class_id' => $data['classeId'] ?? $payment?->class_id,
            'period_month' => isset($data['periodMonth'])
                ? Carbon::createFromFormat('Y-m', $data['periodMonth'])->startOfMonth()
                : $payment?->period_month,
            'amount' => $amount,
            'amount_paid' => $amountPaid,
            'status' => $status,
            'method' => $hasReceivedMoney
                ? (array_key_exists('method', $data) ? $data['method'] : $payment?->method)
                : null,
            'paid_at' => $paidAt,
            'note' => array_key_exists('note', $data) ? $data['note'] : $payment?->note,
            'invoice_generated' => $data['invoiceGenerated'] ?? $payment?->invoice_generated ?? false,
        ];
    }

    private function perPage(mixed $value): int
    {
        return max(1, min(50, (int) ($value ?: 8)));
    }
}
