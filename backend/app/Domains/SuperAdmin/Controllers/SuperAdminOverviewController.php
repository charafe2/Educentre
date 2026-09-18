<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\CentreInvoice;
use App\Domains\Core\Models\PackagePlan;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class SuperAdminOverviewController extends Controller
{
    /** Rows shown in the "Factures centres" panel. */
    private const RECENT_INVOICE_LIMIT = 8;

    /**
     * Payment overview for the superadmin console landing page.
     *
     * Shape is dictated by SuperAdminOverview in
     * src/app/superadmin/superadmin-api.service.ts — keep them in step.
     */
    public function __invoke(): JsonResponse
    {
        // Cancelled invoices are excluded outright: they are not owed money, and
        // the frontend's status union is only paid | pending | late, so letting
        // one through would render an unstyled badge.
        $invoices = CentreInvoice::query()
            ->with('centre:id,name,city')
            ->where('status', '!=', CentreInvoice::STATUS_CANCELLED)
            ->latest('issued_at')
            ->latest('id')
            ->get();

        // "late" is derived from the due date rather than stored, so bucket on
        // displayStatus() here instead of grouping by the status column.
        $byStatus = $invoices->groupBy(fn (CentreInvoice $invoice) => $invoice->displayStatus());

        return $this->success([
            'invoices' => $this->recentInvoices($invoices),
            'packageMix' => $this->packageMix($invoices),
            'summary' => [
                'totalRevenue' => (float) $invoices->sum('amount'),
                'pendingAmount' => (float) $this->bucket($byStatus, CentreInvoice::STATUS_PENDING)->sum('amount'),
                'lateAmount' => (float) $this->bucket($byStatus, CentreInvoice::STATUS_LATE)->sum('amount'),
                'paidCount' => $this->bucket($byStatus, CentreInvoice::STATUS_PAID)->count(),
            ],
        ]);
    }

    /** @param  Collection<int, CentreInvoice>  $invoices */
    private function recentInvoices(Collection $invoices): array
    {
        return $invoices
            ->take(self::RECENT_INVOICE_LIMIT)
            ->map(fn (CentreInvoice $invoice) => [
                'id' => $invoice->invoice_number,
                'centre' => $invoice->centre?->name ?? '-',
                'city' => $invoice->centre?->city ?? '-',
                'packageName' => $invoice->package_name,
                'amount' => (float) $invoice->amount,
                // Printed verbatim by the template, so format it here.
                'dueDate' => $invoice->due_date?->format('d/m/Y'),
                'status' => $invoice->displayStatus(),
            ])
            ->values()
            ->all();
    }

    /**
     * Revenue and reach per plan. Driven off the catalogue rather than the
     * invoices, so a plan nobody has bought still appears with zeroes.
     *
     * @param  Collection<int, CentreInvoice>  $invoices
     */
    private function packageMix(Collection $invoices): array
    {
        return PackagePlan::query()
            ->orderBy('monthly_price')
            ->get()
            ->map(function (PackagePlan $plan) use ($invoices) {
                // Match on the foreign key, not package_name: the name is
                // denormalised onto the invoice and may be a historic label.
                $matching = $invoices->where('package_plan_id', $plan->id);

                return [
                    'name' => $plan->name,
                    'centres' => $matching->pluck('centre_id')->unique()->count(),
                    'revenue' => (float) $matching->sum('amount'),
                    'tone' => $this->tone($plan->name),
                ];
            })
            ->values()
            ->all();
    }

    /** @param  Collection<string, Collection<int, CentreInvoice>>  $byStatus */
    private function bucket(Collection $byStatus, string $status): Collection
    {
        return $byStatus->get($status) ?? collect();
    }

    private function tone(string $planName): string
    {
        $name = mb_strtolower($planName);

        return $name === 'basique' ? 'basic' : $name;
    }
}
