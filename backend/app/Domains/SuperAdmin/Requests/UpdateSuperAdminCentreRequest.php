<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSuperAdminCentreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'superadmin';
    }

    public function rules(): array
    {
        $ownerId = $this->route('centre')?->tenant?->users?->firstWhere('role', 'admin')?->id;

        return [
            'centreName' => ['required', 'string', 'max:255'],
            'centreType' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'ownerName' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($ownerId)],
            'phone' => ['nullable', 'string', 'max:40'],
            'password' => ['nullable', 'string', 'min:6'],
            'plan' => ['required', 'string', 'max:80'],
        ];
    }
}
