<?php

namespace App\Domains\SuperAdmin\Requests;

use App\Domains\Core\Models\CentreInvoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCentreInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The frontend sends "late" as if it were a stored status. It isn't — it is
     * derived from the due date — so normalise it away before validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('status') === CentreInvoice::STATUS_LATE) {
            $this->merge(['status' => CentreInvoice::STATUS_PENDING]);
        }
    }

    public function rules(): array
    {
        return [
            'centreId' => ['required', 'integer', Rule::exists('centres', 'id')->whereNull('deleted_at')],
            'packagePlanId' => ['nullable', 'integer', Rule::exists('package_plans', 'id')->whereNull('deleted_at')],
            // Optional when a plan is given — the plan's name is snapshotted instead.
            'packageName' => ['required_without:packagePlanId', 'nullable', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01', 'max:99999999.99'],
            'issuedAt' => ['required', 'date'],
            'dueDate' => ['required', 'date', 'after_or_equal:issuedAt'],
            'status' => ['nullable', Rule::in(CentreInvoice::STORED_STATUSES)],
            'paidAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'centreId.required' => 'Le centre est requis.',
            'centreId.exists' => 'Ce centre est introuvable.',
            'packagePlanId.exists' => 'Ce package est introuvable.',
            'packageName.required_without' => 'Le nom du package est requis.',
            'amount.min' => 'Le montant doit être supérieur à 0.',
            'dueDate.after_or_equal' => "L'échéance ne peut pas précéder la date d'émission.",
        ];
    }
}
