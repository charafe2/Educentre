<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\SuperAdmin\Models\CentreInvoice;
use App\Domains\SuperAdmin\Requests\StoreCentreInvoiceRequest;
use App\Domains\SuperAdmin\Resources\CentreInvoiceResource;
use App\Domains\SuperAdmin\Services\CentreInvoiceService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CentreInvoiceController extends Controller
{
    public function __construct(private readonly CentreInvoiceService $invoiceService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return $this->success(CentreInvoiceResource::collection(
            $this->invoiceService->all($request->only(['status', 'centreId']))
        ));
    }

    public function store(StoreCentreInvoiceRequest $request): JsonResponse
    {
        return $this->success(
            new CentreInvoiceResource($this->invoiceService->create($request->validated())),
            'Facture centre créée avec succès.',
            201
        );
    }

    public function markPaid(CentreInvoice $invoice, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        return $this->success(
            new CentreInvoiceResource($this->invoiceService->markPaid($invoice)),
            'Facture marquée comme payée.'
        );
    }

    public function destroy(CentreInvoice $invoice, Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        $this->invoiceService->delete($invoice);

        return $this->success(null, 'Facture supprimée.');
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'superadmin', 403, 'Accès super-admin requis.');
    }
}
