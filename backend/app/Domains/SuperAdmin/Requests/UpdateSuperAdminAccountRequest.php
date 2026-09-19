<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateSuperAdminAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The console always sends `password`, empty when it isn't being changed.
     * Strip the empty value so 'nullable' doesn't have to mean "blank is a
     * valid password".
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('password') && blank($this->input('password'))) {
            // replace() targets the active input source; removing from
            // $this->request misses the JSON bag the console actually posts.
            $input = $this->all();
            unset($input['password']);
            $this->replace($input);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required', 'string', 'email', 'max:190',
                Rule::unique('super_admins', 'email')->ignore($this->route('id')),
            ],
            // Absent means "keep the current password".
            'password' => ['sometimes', 'string', Password::min(12)->letters()->numbers()],
            'status' => ['nullable', Rule::in(['active', 'suspended'])],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom est requis.',
            'email.required' => "L'email est requis.",
            'email.unique' => 'Cet email est déjà utilisé par un compte super-admin.',
        ];
    }
}
