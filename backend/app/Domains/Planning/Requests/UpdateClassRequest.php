<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'max:255'],
            'teacherId' => ['nullable', 'integer', 'exists:teachers,id'],
            'roomId' => ['nullable', 'integer', 'exists:rooms,id'],
            'maxCapacity' => ['nullable', 'integer', 'min:1'],
            'monthlyPrice' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'teacherId.exists' => 'Le professeur sélectionné n\'existe pas.',
            'roomId.exists' => 'La salle sélectionnée n\'existe pas.',
        ];
    }
}
