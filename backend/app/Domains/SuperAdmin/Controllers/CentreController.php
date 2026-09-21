<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\Subscription;
use App\Domains\Core\Scopes\TenantScope;
use App\Domains\Students\Models\Student;
use App\Domains\SuperAdmin\Requests\AddSiblingCentreRequest;
use App\Domains\SuperAdmin\Requests\StoreCentreRequest;
use App\Domains\SuperAdmin\Requests\UpdateCentreRequest;
use App\Domains\SuperAdmin\Services\CentreService;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CentreController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly CentreService $centres) {}

    public function index(): JsonResponse
    {
        $centres = Centre::query()->with('tenant.accountGroup')->orderBy('name')->get();

        return $this->success($centres->map(fn (Centre $centre) => $this->present($centre)));
    }

    public function store(StoreCentreRequest $request): JsonResponse
    {
        $centre = $this->centres->create($request->validated());

        return $this->success(
            data: $this->present($centre),
            message: 'Centre créé avec succès.',
            code: 201,
        );
    }

    public function update(UpdateCentreRequest $request, int $id): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($id);

        return $this->success(
            data: $this->present($this->centres->update($centre, $request->validated())),
            message: 'Centre mis à jour.',
        );
    }

    public function toggleStatus(int $id): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($id);

        $centre = $this->centres->toggleStatus($centre);

        return $this->success(
            data: $this->present($centre),
            message: $centre->is_active ? 'Centre réactivé.' : 'Centre suspendu.',
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $centre = Centre::query()->findOrFail($id);

        $this->centres->delete($centre);

        return $this->success(message: 'Centre supprimé.');
    }

    public function enableMultitenant(int $id): JsonResponse
    {
        $centre = Centre::query()->with('tenant.accountGroup')->findOrFail($id);

        return $this->success(
            data: $this->present($this->centres->enableMultitenant($centre)),
            message: 'Compte multi-centres activé.',
        );
    }

    public function disableMultitenant(int $id): JsonResponse
    {
        $centre = Centre::query()->with('tenant.accountGroup')->findOrFail($id);

        return $this->success(
            data: $this->present($this->centres->disableMultitenant($centre)),
            message: 'Compte multi-centres désactivé.',
        );
    }

    public function addSiblingCentre(int $id, AddSiblingCentreRequest $request): JsonResponse
    {
        $centre = Centre::query()->with('tenant.accountGroup')->findOrFail($id);

        $created = $this->centres->addSiblingCentre($centre, $request->validated());

        return $this->success(
            data: $this->present($created),
            message: 'Centre ajouté au compte multi-centres.',
            code: 201,
        );
    }

    public function updateMaxUsers(int $centreId, Request $request): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($centreId);

        $validated = $request->validate([
            'maxUsers' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        if (! $centre->tenant) {
            return $this->error('Ce centre est introuvable.', null, 404);
        }

        $centre->tenant->setMaxUsers($validated['maxUsers']);

        return $this->success(
            data: ['maxUsers' => $centre->tenant->fresh()->max_users],
            message: "Limite d'utilisateurs mise à jour.",
        );
    }

    public function subjects(int $centreId): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($centreId);

        $subjectIds = $centre->tenant?->subjects()->pluck('subjects.id') ?? collect();

        return $this->success(['subjectIds' => $subjectIds->values()]);
    }

    public function syncSubjects(int $centreId, Request $request): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($centreId);

        $validated = $request->validate([
            'subjectIds' => ['present', 'array'],
            'subjectIds.*' => [Rule::exists('subjects', 'id')],
        ]);

        $centre->tenant?->subjects()->sync($validated['subjectIds']);

        $subjectIds = $centre->tenant?->subjects()->pluck('subjects.id') ?? collect();

        return $this->success(['subjectIds' => $subjectIds->values()], 'Matières mises à jour avec succès.');
    }

    public function academicLevels(int $centreId): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($centreId);

        $levelIds = $centre->tenant?->academicLevels()->pluck('academic_levels.id') ?? collect();

        return $this->success(['levelIds' => $levelIds->values()]);
    }

    public function syncAcademicLevels(int $centreId, Request $request): JsonResponse
    {
        $centre = Centre::query()->with('tenant')->findOrFail($centreId);

        $validated = $request->validate([
            'levelIds' => ['present', 'array'],
            'levelIds.*' => [Rule::exists('academic_levels', 'id')],
        ]);

        $centre->tenant?->academicLevels()->sync($validated['levelIds']);

        $levelIds = $centre->tenant?->academicLevels()->pluck('academic_levels.id') ?? collect();

        return $this->success(['levelIds' => $levelIds->values()], 'Niveaux mis à jour avec succès.');
    }

    /**
     * The ClientAccount row the superadmin UI renders. Shared by index and every
     * write endpoint so a created/updated centre comes back in the same shape
     * the list already uses.
     */
    private function present(Centre $centre): array
    {
        $owner = User::where('tenant_id', $centre->tenant_id)->orderBy('id')->first();
        $subscription = Subscription::where('tenant_id', $centre->tenant_id)->latest()->first();
        $groupId = $centre->tenant?->account_group_id;

        return [
            'id' => $centre->id,
            'uuid' => $centre->uuid,
            'tenantUuid' => $centre->tenant?->uuid,
            'centreName' => $centre->name,
            'centreType' => $centre->type,
            'city' => $centre->city,
            'ownerName' => $owner?->name ?? '-',
            'email' => $owner?->email ?? '-',
            'phone' => $centre->phone,
            'plan' => $subscription->plan ?? 'Pro',
            'status' => $centre->is_active ? 'active' : 'suspended',
            'createdAt' => $centre->created_at,
            'studentsCount' => Student::where('tenant_id', $centre->tenant_id)->count(),
            'usersCount' => User::where('tenant_id', $centre->tenant_id)->count(),
            'maxUsers' => $centre->tenant?->max_users ?? 5,
            'isMultitenant' => (bool) $centre->tenant?->accountGroup?->is_multitenant,
            'accountGroupUuid' => $centre->tenant?->accountGroup?->uuid,
            'siblingCentres' => $groupId
                ? Centre::withoutGlobalScope(TenantScope::class)
                    ->whereHas('tenant', fn ($q) => $q->where('account_group_id', $groupId))
                    ->where('id', '!=', $centre->id)
                    ->get()
                    ->map(fn (Centre $c) => ['id' => $c->id, 'uuid' => $c->uuid, 'centreName' => $c->name, 'city' => $c->city])
                    ->values()
                : [],
        ];
    }
}
