<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePackagePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120', Rule::unique('package_plans', 'name')->whereNull('deleted_at')],
            'monthlyPrice' => ['required', 'numeric', 'min:0'],
            'usersLimit' => ['required', 'integer', 'min:0'],
            'studentsLimit' => ['required', 'integer', 'min:0'],
            'storageGb' => ['required', 'integer', 'min:0'],
            'supportLevel' => ['required', Rule::in(['Standard', 'Prioritaire', 'Dédié'])],
            'status' => ['required', Rule::in(['active', 'draft', 'archived'])],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:120'],
        ];
    }
}
