<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maxCapacity' => ['nullable', 'integer', 'min:1'],
            'teacherId' => ['nullable', 'integer', 'exists:teachers,id'],
            'roomId' => ['nullable', 'integer', 'exists:rooms,id'],
            'monthlyPrice' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
