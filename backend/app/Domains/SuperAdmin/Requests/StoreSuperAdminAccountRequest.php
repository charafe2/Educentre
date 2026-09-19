<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreSuperAdminAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            // Not scoped to deleted_at, matching the DB unique index: a removed
            // operator's address stays reserved rather than 500-ing on insert.
            'email' => ['required', 'string', 'email', 'max:190', Rule::unique('super_admins', 'email')],
            'password' => ['required', 'string', Password::min(12)->letters()->numbers()],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom est requis.',
            'email.required' => "L'email est requis.",
            'email.unique' => 'Cet email est déjà utilisé par un compte super-admin.',
            'password.required' => 'Un mot de passe initial est requis.',
        ];
    }
}
