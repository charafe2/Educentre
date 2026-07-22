<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('subjects', 'name')
                    ->where(fn ($query) => $query->where('tenant_id', $this->user()->tenant_id))
                    ->ignore($this->route('id')),
            ],
            'color' => ['nullable', 'string', 'max:20'],
            'bgColor' => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Le nom de la matière est obligatoire.',
            'name.unique' => 'Cette matière existe déjà.',
        ];
    }
}
