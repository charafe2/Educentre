<?php

namespace App\Domains\Settings\Requests;

use App\Domains\Settings\Support\TenantPermissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => [Rule::in(TenantPermissions::KEYS)],
        ];
    }
}
