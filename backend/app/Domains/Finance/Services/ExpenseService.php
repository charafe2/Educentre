<?php

namespace App\Domains\Finance\Services;

use App\Domains\Finance\Models\Expense;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

class ExpenseService
{
    public function all(int $tenantId, ?string $month = null): Collection
    {
        return Expense::query()
            ->where('tenant_id', $tenantId)
            ->when($month, fn ($query, string $month) => $query->whereDate(
                'period_month',
                Carbon::createFromFormat('Y-m', $month)->startOfMonth(),
            ))
            ->orderByDesc('expense_date')
            ->get();
    }

    public function create(int $tenantId, array $data): Expense
    {
        $date = Carbon::parse($data['date']);

        return Expense::create([
            'tenant_id' => $tenantId,
            'category' => $data['category'],
            'label' => $data['label'],
            'amount' => $data['amount'],
            'method' => $data['method'] ?? null,
            'expense_date' => $date,
            'period_month' => $date->copy()->startOfMonth(),
            'is_recurring' => $data['recurring'] ?? false,
        ]);
    }

    public function delete(int $tenantId, int $id): void
    {
        Expense::query()->where('tenant_id', $tenantId)->findOrFail($id)->delete();
    }
}
