<?php

namespace App\Domains\SuperAdmin\Requests;

use App\Domains\Core\Models\Centre;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCentreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // The owner's own row must be excluded from the uniqueness check, or
        // saving the form unchanged would report the email as taken.
        $ownerId = Centre::withTrashed()
            ->find($this->route('id'))
            ?->tenant?->users()->orderBy('id')->value('id');

        return [
            'centreName' => ['required', 'string', 'max:120'],
            'centreType' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'ownerName' => ['required', 'string', 'max:120'],
            'email' => [
                'required', 'email', 'max:190',
                Rule::unique('users', 'email')->ignore($ownerId),
            ],
            'phone' => ['nullable', 'string', 'max:40'],
            // Omitted or null leaves the existing password untouched.
            'password' => ['nullable', 'string', 'min:8', 'max:190'],
            'plan' => ['required', 'string', Rule::exists('package_plans', 'name')],
        ];
    }

    public function messages(): array
    {
        return [
            'centreName.required' => 'Le nom du centre est requis.',
            'ownerName.required' => 'Le nom du propriétaire est requis.',
            'email.unique' => 'Cet email est déjà utilisé.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'plan.exists' => "Cette formule n'existe pas dans le catalogue.",
        ];
    }
}
