<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\Centre;
use App\Domains\Core\Models\Subscription;
use App\Domains\Students\Models\Student;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CentreController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $centres = Centre::query()->with('tenant')->orderBy('name')->get();

        $data = $centres->map(function (Centre $centre) {
            $owner = User::where('tenant_id', $centre->tenant_id)->orderBy('id')->first();
            $subscription = Subscription::where('tenant_id', $centre->tenant_id)->latest()->first();
            $studentsCount = Student::where('tenant_id', $centre->tenant_id)->count();

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
                'studentsCount' => $studentsCount,
            ];
        });

        return $this->success($data);
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
}
