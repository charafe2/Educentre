<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCentreRequest extends FormRequest
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
            'ownerName' => ['required', 'string', 'max:120'],
            // The owner becomes a User, so the email must be unique there.
            'email' => ['required', 'email', 'max:190', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'min:8', 'max:190'],
            // Plans are looked up by name in the package catalogue; the monthly
            // price is copied from there rather than trusted from the client.
            'plan' => ['required', 'string', Rule::exists('package_plans', 'name')],
        ];
    }

    public function messages(): array
    {
        return [
            'centreName.required' => 'Le nom du centre est requis.',
            'ownerName.required' => 'Le nom du propriétaire est requis.',
            'email.required' => "L'email est requis.",
            'email.email' => "L'email n'est pas valide.",
            'email.unique' => 'Cet email est déjà utilisé.',
            'password.required' => 'Le mot de passe est requis.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
            'plan.required' => 'La formule est requise.',
            'plan.exists' => "Cette formule n'existe pas dans le catalogue.",
        ];
    }
}
