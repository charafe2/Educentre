<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Payment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class PaymentService
{
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

    public function summary(int $tenantId, array $filters = []): array
    {
        $payments = $this->query($tenantId, $filters)->reorder();

        return [
            'totalPaid' => (float) (clone $payments)->where('status', 'paid')->sum('amount'),
            'totalPending' => (float) (clone $payments)->where('status', 'pending')->sum('amount'),
            'totalOverdue' => (float) (clone $payments)->where('status', 'overdue')->sum('amount'),
            'paidCount' => (clone $payments)->where('status', 'paid')->count(),
            'pendingCount' => (clone $payments)->where('status', 'pending')->count(),
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
            'method' => $data['method'],
            'paid_at' => $data['paidAt'] ?? now()->toDateString(),
        ]);

        return $payment->refresh();
    }

    public function delete(int $tenantId, int $id): void
    {
        $this->findForTenant($tenantId, $id)->delete();
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
        $paidAt = array_key_exists('paidAt', $data) ? $data['paidAt'] : $payment?->paid_at;

        if ($status === 'paid' && $paidAt === null) {
            $paidAt = now()->toDateString();
        } elseif ($status !== 'paid') {
            $paidAt = null;
        }

        return [
            'student_id' => $data['studentId'] ?? $payment?->student_id,
            'class_id' => $data['classeId'] ?? $payment?->class_id,
            'period_month' => isset($data['periodMonth'])
                ? Carbon::createFromFormat('Y-m', $data['periodMonth'])->startOfMonth()
                : $payment?->period_month,
            'amount' => $data['amount'] ?? $payment?->amount,
            'status' => $status,
            'method' => $status === 'paid'
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
