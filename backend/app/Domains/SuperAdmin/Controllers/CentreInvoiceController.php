<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\CentreInvoice;
use App\Domains\SuperAdmin\Requests\StoreCentreInvoiceRequest;
use App\Domains\SuperAdmin\Resources\CentreInvoiceResource;
use App\Domains\SuperAdmin\Services\CentreInvoiceService;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CentreInvoiceController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly CentreInvoiceService $invoices) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([...CentreInvoice::STORED_STATUSES, CentreInvoice::STATUS_LATE])],
            'centreId' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        return $this->respond(
            CentreInvoiceResource::collection($this->invoices->list($filters))
        );
    }

    public function show(int $id): JsonResponse
    {
        $invoice = CentreInvoice::with('centre:id,name,city')->findOrFail($id);

        return $this->respond(CentreInvoiceResource::make($invoice));
    }

    public function store(StoreCentreInvoiceRequest $request): JsonResponse
    {
        $invoice = $this->invoices->create($request->validated());

        return $this->respond(
            CentreInvoiceResource::make($invoice->load('centre:id,name,city')),
            message: 'Facture créée.',
            code: 201,
        );
    }

    public function markPaid(Request $request, int $id): JsonResponse
    {
        $invoice = CentreInvoice::findOrFail($id);

        if ($invoice->status === CentreInvoice::STATUS_CANCELLED) {
            return $this->error('Une facture annulée ne peut pas être encaissée.', null, 422);
        }

        $validated = $request->validate([
            'paidAt' => ['nullable', 'date'],
        ]);

        return $this->respond(
            CentreInvoiceResource::make($this->invoices->markPaid($invoice, $validated['paidAt'] ?? null)),
            message: 'Facture marquée comme payée.',
        );
    }

    public function markUnpaid(int $id): JsonResponse
    {
        $invoice = CentreInvoice::findOrFail($id);

        return $this->respond(
            CentreInvoiceResource::make($this->invoices->markUnpaid($invoice)),
            message: 'Facture remise à encaisser.',
        );
    }

    public function cancel(int $id): JsonResponse
    {
        $invoice = CentreInvoice::findOrFail($id);

        if ($invoice->status === CentreInvoice::STATUS_PAID) {
            return $this->error('Une facture payée ne peut pas être annulée.', null, 422);
        }

        return $this->respond(
            CentreInvoiceResource::make($this->invoices->cancel($invoice)),
            message: 'Facture annulée.',
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $this->invoices->delete(CentreInvoice::findOrFail($id));

        return $this->success(message: 'Facture supprimée.');
    }

    /**
     * JSON_PRESERVE_ZERO_FRACTION keeps whole-number amounts (e.g. 499.0)
     * encoded as floats rather than ints — the frontend sums this field.
     */
    private function respond(mixed $data, string $message = '', int $code = 200): JsonResponse
    {
        return $this->success(
            data: $data,
            message: $message,
            code: $code,
            options: JSON_PRESERVE_ZERO_FRACTION,
        );
    }
}
