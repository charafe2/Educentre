<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\PackagePlan;
use App\Domains\SuperAdmin\Requests\StorePackagePlanRequest;
use App\Domains\SuperAdmin\Requests\UpdatePackagePlanRequest;
use App\Domains\SuperAdmin\Resources\PackagePlanResource;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class PackagePlanController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $plans = PackagePlan::orderBy('monthly_price')->get();

        return $this->success(
            data: PackagePlanResource::collection($plans),
            // JSON_PRESERVE_ZERO_FRACTION keeps whole-number monthlyPrice
            // values (e.g. 199.0) encoded as floats, not ints, on the wire
            // — the frontend does arithmetic on this field.
            options: JSON_PRESERVE_ZERO_FRACTION,
        );
    }

    public function store(StorePackagePlanRequest $request): JsonResponse
    {
        $plan = PackagePlan::create($this->attributes($request->validated()));

        return $this->success(
            data: PackagePlanResource::make($plan),
            message: 'Package créé.',
            code: 201,
            options: JSON_PRESERVE_ZERO_FRACTION,
        );
    }

    public function update(UpdatePackagePlanRequest $request, int $id): JsonResponse
    {
        $plan = PackagePlan::findOrFail($id);
        $plan->update($this->attributes($request->validated()));

        return $this->success(
            data: PackagePlanResource::make($plan->fresh()),
            message: 'Package mis à jour.',
            options: JSON_PRESERVE_ZERO_FRACTION,
        );
    }

    public function destroy(int $id): JsonResponse
    {
        PackagePlan::findOrFail($id)->delete();

        return $this->success(message: 'Package supprimé.');
    }

    /** Maps the camelCase payload onto snake_case columns. */
    private function attributes(array $validated): array
    {
        return [
            'name' => $validated['name'],
            'monthly_price' => $validated['monthlyPrice'],
            'users_limit' => $validated['usersLimit'],
            'students_limit' => $validated['studentsLimit'],
            'storage_gb' => $validated['storageGb'],
            'support_level' => $validated['supportLevel'],
            'status' => $validated['status'],
            'features' => $validated['features'] ?? [],
        ];
    }
}
