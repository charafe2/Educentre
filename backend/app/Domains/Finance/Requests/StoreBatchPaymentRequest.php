<?php

namespace App\Domains\Finance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBatchPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'studentId' => ['required', 'integer', Rule::exists('students', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'method' => ['required', Rule::in(['Espèces', 'Virement', 'Chèque'])],
            'paidAt' => ['nullable', 'date'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.classeId' => ['required', 'integer', Rule::exists('classes', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'lines.*.periodMonth' => ['required', 'date_format:Y-m'],
            'lines.*.amount' => ['required', 'numeric', 'min:0.01'],
        ];
    }
}
