<?php

namespace App\Domains\Finance\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
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
            'classeId' => ['required', 'integer', Rule::exists('classes', 'id')->where('tenant_id', $tenantId)->whereNull('deleted_at')],
            'periodMonth' => ['required', 'date_format:Y-m'],
            'amount' => ['required', 'numeric', 'min:0'],
            'status' => ['required', Rule::in(['paid', 'pending', 'overdue'])],
            'method' => ['nullable', 'required_if:status,paid', Rule::in(['Espèces', 'Virement', 'Chèque'])],
            'paidAt' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'invoiceGenerated' => ['nullable', 'boolean'],
        ];
    }
}
