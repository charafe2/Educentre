<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGroupCapacityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maxCapacity' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'maxCapacity.required' => 'La capacité maximale est obligatoire.',
            'maxCapacity.min' => 'La capacité minimale est de 1.',
        ];
    }
}
