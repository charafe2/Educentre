<?php

namespace App\Domains\SuperAdmin\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCentreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'superadmin';
    }

    public function rules(): array
    {
        return [
            'centreId' => ['required', 'integer', 'exists:centres,id'],
            'packagePlanId' => ['nullable', 'integer', 'exists:package_plans,id'],
            'packageName' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0'],
            'issuedAt' => ['required', 'date'],
            'dueDate' => ['required', 'date', 'after_or_equal:issuedAt'],
            'status' => ['required', Rule::in(['pending', 'paid', 'late', 'cancelled'])],
            'paidAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
