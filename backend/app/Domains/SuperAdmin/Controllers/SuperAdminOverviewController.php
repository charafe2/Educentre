<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Models\CentreInvoice;
use App\Domains\SuperAdmin\Services\PackagePlanService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperAdminOverviewController extends Controller
{
    public function __construct(private readonly PackagePlanService $packagePlanService) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'superadmin', 403, 'Accès super-admin requis.');

        $invoices = CentreInvoice::query()
            ->with('tenant.centre')
            ->latest('issued_at')
            ->latest('id')
            ->get();

        $invoiceRows = $invoices->take(8)->values()->map(fn (CentreInvoice $invoice) => [
            'id' => $invoice->invoice_number,
            'centre' => $invoice->tenant?->centre?->name ?? $invoice->tenant?->name ?? 'Centre',
            'city' => $invoice->tenant?->centre?->city ?? '',
            'packageName' => $invoice->package_name,
            'amount' => (float) $invoice->amount,
            'dueDate' => $invoice->due_date?->format('d/m/Y'),
            'status' => match ($invoice->status) {
                'paid' => 'paid',
                'late' => 'late',
                default => 'pending',
            },
        ]);

        $packageMix = $this->packagePlanService->all()->map(function ($plan) use ($invoices) {
            $matchingInvoices = $invoices->where('package_name', $plan->name);

            return [
                'name' => $plan->name,
                'centres' => $matchingInvoices->pluck('tenant_id')->unique()->count(),
                'revenue' => (float) $matchingInvoices->sum('amount'),
                'tone' => strtolower($plan->name) === 'basique' ? 'basic' : strtolower($plan->name),
            ];
        })->values();

        return $this->success([
            'invoices' => $invoiceRows,
            'packageMix' => $packageMix,
            'summary' => [
                'totalRevenue' => (float) $invoices->sum('amount'),
                'pendingAmount' => (float) $invoices->where('status', 'pending')->sum('amount'),
                'lateAmount' => (float) $invoices->where('status', 'late')->sum('amount'),
                'paidCount' => $invoices->where('status', 'paid')->count(),
            ],
        ]);
    }
}
