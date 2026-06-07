<?php

namespace App\Domains\Finance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkPaymentPaidRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'method' => ['required', Rule::in(['Espèces', 'Virement', 'Chèque'])],
            'paidAt' => ['nullable', 'date'],
        ];
    }
}
