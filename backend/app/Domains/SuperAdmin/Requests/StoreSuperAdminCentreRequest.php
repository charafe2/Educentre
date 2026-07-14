<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSuperAdminCentreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'superadmin';
    }

    public function rules(): array
    {
        return [
            'centreName' => ['required', 'string', 'max:255'],
            'centreType' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'ownerName' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['required', 'string', 'min:6'],
            'plan' => ['required', 'string', 'max:80'],
        ];
    }
}
