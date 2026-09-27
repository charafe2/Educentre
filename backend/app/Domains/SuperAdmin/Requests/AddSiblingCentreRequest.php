<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Adds a centre to an already-multitenant account. Deliberately has no
 * ownerName/email/password fields — the new centre's owner always reuses
 * the group owner's existing credentials verbatim (see
 * CentreService::addSiblingCentre), so there is no client-supplied input
 * that could create a credential collision.
 */
class AddSiblingCentreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'centreName' => ['required', 'string', 'max:120'],
            'centreType' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'plan' => ['required', 'string', Rule::exists('package_plans', 'name')],
        ];
    }

    public function messages(): array
    {
        return [
            'centreName.required' => 'Le nom du centre est requis.',
            'plan.required' => 'La formule est requise.',
            'plan.exists' => "Cette formule n'existe pas dans le catalogue.",
        ];
    }
}
