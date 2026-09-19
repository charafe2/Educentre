<?php

namespace App\Domains\SuperAdmin\Services;

use App\Domains\Core\Models\PackagePlan;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class PackagePlanService
{
    /** Guards the copy-name search from looping forever on absurd input. */
    private const MAX_COPY_SUFFIX = 50;

    /**
     * @param  array{status?: string|null, search?: string|null}  $filters
     * @return Collection<int, PackagePlan>
     */
    public function list(array $filters = []): Collection
    {
        return PackagePlan::query()
            ->withCount('invoices')
            ->when(
                filled($filters['status'] ?? null),
                fn ($query) => $query->withStatus($filters['status'])
            )
            ->when(
                filled($filters['search'] ?? null),
                fn ($query) => $query->search($filters['search'])
            )
            // Cheapest first, then by name so equally-priced plans keep a stable
            // order across requests.
            ->orderBy('monthly_price')
            ->orderBy('name')
            ->get();
    }

    public function find(int $id): PackagePlan
    {
        return PackagePlan::withCount('invoices')->findOrFail($id);
    }

    public function create(array $data): PackagePlan
    {
        return PackagePlan::create($this->attributes($data));
    }

    public function update(PackagePlan $plan, array $data): PackagePlan
    {
        $plan->update($this->attributes($data));

        return $plan->fresh()->loadCount('invoices');
    }

    /**
     * Copies a plan as a draft under a free name.
     *
     * Naming is resolved here rather than by the caller because "<name> copie"
     * collides the second time you duplicate the same plan, and the name column
     * is unique.
     */
    public function duplicate(PackagePlan $plan): PackagePlan
    {
        return PackagePlan::create([
            'name' => $this->availableCopyName($plan->name),
            'monthly_price' => $plan->monthly_price,
            'users_limit' => $plan->users_limit,
            'students_limit' => $plan->students_limit,
            'storage_gb' => $plan->storage_gb,
            'support_level' => $plan->support_level,
            // A copy always starts as a draft — never silently sell a new plan.
            'status' => PackagePlan::STATUS_DRAFT,
            'features' => $plan->features ?? [],
        ]);
    }

    public function archive(PackagePlan $plan): PackagePlan
    {
        $plan->update(['status' => PackagePlan::STATUS_ARCHIVED]);

        return $plan->fresh()->loadCount('invoices');
    }

    public function delete(PackagePlan $plan): void
    {
        $plan->delete();
    }

    /**
     * The plan name still counts as taken while soft-deleted, so the copy
     * suffix has to skip trashed rows too — otherwise create() hits the DB
     * unique index and 500s.
     */
    private function availableCopyName(string $name): string
    {
        $base = Str::limit($name, 100, '').' copie';

        for ($suffix = 0; $suffix <= self::MAX_COPY_SUFFIX; $suffix++) {
            $candidate = $suffix === 0 ? $base : $base.' '.($suffix + 1);

            $taken = PackagePlan::withTrashed()->where('name', $candidate)->exists();

            if (! $taken) {
                return $candidate;
            }
        }

        // Fall back to something guaranteed free rather than failing the request.
        return $base.' '.Str::lower(Str::random(6));
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
            'features' => array_values($validated['features'] ?? []),
        ];
    }
}
