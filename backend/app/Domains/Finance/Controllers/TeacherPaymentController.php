<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Resources\TeacherPaymentResource;
use App\Domains\Finance\Services\TeacherPaymentService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherPaymentController extends Controller
{
    public function __construct(private readonly TeacherPaymentService $teacherPaymentService) {}

    public function index(Request $request): JsonResponse
    {
        $payments = $this->teacherPaymentService->all($request->user()->tenant_id, $request->query('month'));

        return $this->success(TeacherPaymentResource::collection($payments));
    }

    public function markAsPaid(int $teacherId, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            'amount' => ['required', 'numeric', 'min:0'],
            'method' => ['required', 'string', 'in:Espèces,Virement,Chèque'],
        ]);

        $payment = $this->teacherPaymentService->markAsPaid(
            $request->user()->tenant_id,
            $teacherId,
            $validated['month'],
            $validated['amount'],
            $validated['method'],
        );

        return $this->success(new TeacherPaymentResource($payment), 'Salaire marqué comme payé.');
    }

    public function destroy(int $teacherId, Request $request): JsonResponse
    {
        $month = $request->validate(['month' => ['required', 'date_format:Y-m']])['month'];
        $this->teacherPaymentService->markAsUnpaid($request->user()->tenant_id, $teacherId, $month);

        return $this->success(null, 'Paiement annulé.');
    }
}
