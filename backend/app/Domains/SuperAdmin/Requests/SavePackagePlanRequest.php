<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavePackagePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'superadmin';
    }

    public function rules(): array
    {
        $packagePlanId = $this->route('packagePlan')?->id;

        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('package_plans', 'name')->ignore($packagePlanId)],
            'monthlyPrice' => ['required', 'numeric', 'min:0'],
            'usersLimit' => ['required', 'integer', 'min:1'],
            'studentsLimit' => ['required', 'integer', 'min:1'],
            'storageGb' => ['required', 'integer', 'min:1'],
            'supportLevel' => ['required', 'string', 'max:80'],
            'status' => ['required', Rule::in(['active', 'draft', 'archived'])],
            'features' => ['array'],
            'features.*' => ['string', 'max:160'],
        ];
    }
}
