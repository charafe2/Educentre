<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\CentreInvoice;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class InvoiceNumberGenerator
{
    /**
     * Next number for the year of $issuedAt, e.g. FAC-2026-0001.
     *
     * Soft-deleted invoices are included: an accounting number must never be
     * handed out twice, even if its row was removed.
     */
    public function nextFor(string $issuedAt): string
    {
        $prefix = 'FAC-'.Carbon::parse($issuedAt)->year.'-';

        return DB::transaction(function () use ($prefix) {
            $last = CentreInvoice::withTrashed()
                ->where('invoice_number', 'like', $prefix.'%')
                ->lockForUpdate()
                ->orderByRaw('LENGTH(invoice_number) DESC, invoice_number DESC')
                ->value('invoice_number');

            $next = $last === null
                ? 1
                : ((int) substr($last, strlen($prefix))) + 1;

            return $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
        });
    }
}
