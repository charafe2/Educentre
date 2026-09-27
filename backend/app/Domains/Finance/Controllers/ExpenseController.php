<?php

namespace App\Domains\Finance\Controllers;

use App\Domains\Finance\Requests\StoreExpenseRequest;
use App\Domains\Finance\Resources\ExpenseResource;
use App\Domains\Finance\Services\ExpenseService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private readonly ExpenseService $expenseService) {}

    public function index(Request $request): JsonResponse
    {
        $expenses = $this->expenseService->all($request->user()->tenant_id, $request->query('month'));

        return $this->success(ExpenseResource::collection($expenses));
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $expense = $this->expenseService->create($request->user()->tenant_id, $request->validated());

        return $this->success(new ExpenseResource($expense), 'Dépense ajoutée.', 201);
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->expenseService->delete($request->user()->tenant_id, $id);

        return $this->success(null, 'Dépense supprimée.');
    }
}
