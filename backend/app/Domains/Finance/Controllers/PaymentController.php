<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Requests\MarkPaymentPaidRequest;
use App\Domains\Finance\Requests\StorePaymentRequest;
use App\Domains\Finance\Requests\UpdatePaymentRequest;
use App\Domains\Finance\Resources\PaymentResource;
use App\Domains\Finance\Services\PaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService) {}

    public function index(Request $request): JsonResponse
    {
        return $this->success(PaymentResource::collection(
            $this->paymentService->all($request->user()->tenant_id)
        ));
    }

    public function store(StorePaymentRequest $request): JsonResponse
    {
        $payment = $this->paymentService->create($request->user()->tenant_id, $request->validated());

        return $this->success(new PaymentResource($payment), 'Paiement créé avec succès.', 201);
    }

    public function update(int $id, UpdatePaymentRequest $request): JsonResponse
    {
        $payment = $this->paymentService->update($request->user()->tenant_id, $id, $request->validated());

        return $this->success(new PaymentResource($payment), 'Paiement mis à jour avec succès.');
    }

    public function markAsPaid(int $id, MarkPaymentPaidRequest $request): JsonResponse
    {
        $payment = $this->paymentService->markAsPaid($request->user()->tenant_id, $id, $request->validated());

        return $this->success(new PaymentResource($payment), 'Paiement marqué comme payé.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->paymentService->delete($request->user()->tenant_id, $id);

        return $this->success(null, 'Paiement supprimé avec succès.');
    }
}
