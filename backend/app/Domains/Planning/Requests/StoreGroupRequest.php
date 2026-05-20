<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'classeId' => ['required', 'integer', 'exists:classes,id'],
            'groupNumber' => ['nullable', 'integer', 'min:1'],
            'maxCapacity' => ['nullable', 'integer', 'min:1'],
            'studentIds' => ['nullable', 'array'],
            'studentIds.*' => ['integer', 'exists:students,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'classeId.required' => 'La classe est obligatoire.',
            'classeId.exists' => 'La classe sélectionnée n\'existe pas.',
            'studentIds.*.exists' => 'Un ou plusieurs étudiants n\'existent pas.',
        ];
    }
}
