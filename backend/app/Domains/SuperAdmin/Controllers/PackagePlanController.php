<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\PackagePlan;
use App\Domains\SuperAdmin\Requests\StorePackagePlanRequest;
use App\Domains\SuperAdmin\Requests\UpdatePackagePlanRequest;
use App\Domains\SuperAdmin\Resources\PackagePlanResource;
use App\Domains\SuperAdmin\Services\PackagePlanService;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PackagePlanController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly PackagePlanService $plans) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(PackagePlan::STATUSES)],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        return $this->respond(
            PackagePlanResource::collection($this->plans->list($filters))
        );
    }

    public function show(int $id): JsonResponse
    {
        return $this->respond(PackagePlanResource::make($this->plans->find($id)));
    }

    public function store(StorePackagePlanRequest $request): JsonResponse
    {
        return $this->respond(
            PackagePlanResource::make($this->plans->create($request->validated())),
            message: 'Package créé.',
            code: 201,
        );
    }

    public function update(UpdatePackagePlanRequest $request, int $id): JsonResponse
    {
        $plan = PackagePlan::findOrFail($id);

        return $this->respond(
            PackagePlanResource::make($this->plans->update($plan, $request->validated())),
            message: 'Package mis à jour.',
        );
    }

    public function duplicate(int $id): JsonResponse
    {
        $plan = PackagePlan::findOrFail($id);

        return $this->respond(
            PackagePlanResource::make($this->plans->duplicate($plan)),
            message: 'Package dupliqué.',
            code: 201,
        );
    }

    public function archive(int $id): JsonResponse
    {
        $plan = PackagePlan::findOrFail($id);

        return $this->respond(
            PackagePlanResource::make($this->plans->archive($plan)),
            message: 'Package archivé.',
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $plan = PackagePlan::findOrFail($id);

        // A billed plan is referenced by accounting history. Archiving hides it
        // from new sales without breaking the trail; deleting would not.
        if ($plan->isInUse()) {
            return $this->error(
                'Ce package a déjà été facturé et ne peut pas être supprimé. Archivez-le à la place.',
                null,
                422,
            );
        }

        $this->plans->delete($plan);

        return $this->success(message: 'Package supprimé.');
    }

    /**
     * JSON_PRESERVE_ZERO_FRACTION keeps whole-number monthlyPrice values
     * (e.g. 199.0) encoded as floats, not ints, on the wire — the frontend
     * does arithmetic on this field.
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
