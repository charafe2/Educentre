<?php

namespace App\Domains\Finance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->user()->tenant_id;

        return [
            'studentId' => ['sometimes', 'integer', Rule::exists('students', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'classeId' => ['sometimes', 'integer', Rule::exists('classes', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'periodMonth' => ['sometimes', 'date_format:Y-m'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['paid', 'pending', 'overdue'])],
            'method' => ['nullable', 'required_if:status,paid', Rule::in(['Espèces', 'Virement', 'Chèque'])],
            'paidAt' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'invoiceGenerated' => ['sometimes', 'boolean'],
        ];
    }
}
