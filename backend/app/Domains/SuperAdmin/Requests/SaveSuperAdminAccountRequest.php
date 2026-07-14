<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveSuperAdminAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'superadmin';
    }

    public function rules(): array
    {
        $accountId = $this->route('account')?->id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($accountId)],
            'password' => [$accountId ? 'nullable' : 'required', 'string', 'min:8'],
            'status' => ['required', Rule::in(['active', 'suspended'])],
        ];
    }
}
