<?php

namespace App\Domains\SuperAdmin\Requests;

use App\Domains\Core\Models\PackagePlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePackagePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Matches the DB unique index, which is NOT scoped to deleted_at:
            // a soft-deleted plan's name stays reserved.
            'name' => [
                'required', 'string', 'max:120',
                Rule::unique('package_plans', 'name')
                    ->ignore($this->route('id')),
            ],
            'monthlyPrice' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'usersLimit' => ['required', 'integer', 'min:0', 'max:100000'],
            'studentsLimit' => ['required', 'integer', 'min:0', 'max:1000000'],
            'storageGb' => ['required', 'integer', 'min:0', 'max:100000'],
            'supportLevel' => ['required', Rule::in(PackagePlan::SUPPORT_LEVELS)],
            'status' => ['required', Rule::in(PackagePlan::STATUSES)],
            'features' => ['nullable', 'array', 'max:50'],
            'features.*' => ['string', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom du package est requis.',
            'name.unique' => 'Ce nom de package est déjà utilisé.',
            'monthlyPrice.required' => 'Le prix mensuel est requis.',
        ];
    }
}
