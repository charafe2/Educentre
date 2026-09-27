<?php

namespace App\Domains\Finance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'category' => ['required', 'string', Rule::in([
                'Loyer', 'Électricité et eau', 'Internet et téléphone', 'Ménage',
                'Fournitures', 'Publicité', 'Maintenance', 'Autre',
            ])],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['nullable', Rule::in(['Espèces', 'Virement', 'Chèque'])],
            'date' => ['required', 'date'],
            'recurring' => ['nullable', 'boolean'],
        ];
    }
}
