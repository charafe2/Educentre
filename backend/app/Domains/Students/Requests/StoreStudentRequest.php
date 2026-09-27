<?php

namespace App\Domains\Students\Requests;

use App\Domains\Planning\Models\CourseClass;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firstName' => ['required', 'string', 'max:255'],
            'lastName' => ['required', 'string', 'max:255'],
            'birthDate' => ['nullable', 'date'],
            'school' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
            'parentName' => ['nullable', 'string', 'max:255'],
            'parentPhone' => ['nullable', 'string', 'max:20'],
            'parentWhatsapp' => ['nullable', 'string', 'max:20'],
            'enrolledClassIds' => ['nullable', 'array'],
            'enrolledClassIds.*' => ['integer', 'exists:classes,id'],
            // Enrollment-time payment (see PaymentService::createForEnrollment) —
            // all optional so this request stays backward compatible with any
            // caller that doesn't send them.
            'totalAmount' => ['nullable', 'numeric', 'min:0'],
            'paymentStatus' => ['nullable', 'string', Rule::in(['paid', 'pending', 'partial'])],
            'amountPaid' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'firstName.required' => 'Le prénom est obligatoire.',
            'lastName.required' => 'Le nom est obligatoire.',
            'enrolledClassIds.*.exists' => 'Une ou plusieurs classes sélectionnées n\'existent pas.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->input('paymentStatus') !== 'partial') {
                return;
            }

            $amountPaid = (float) $this->input('amountPaid', 0);
            if ($amountPaid <= 0) {
                $validator->errors()->add('amountPaid', "Indiquez le montant déjà payé pour un paiement partiel.");

                return;
            }

            $total = $this->input('totalAmount');
            if ($total === null) {
                $classIds = $this->input('enrolledClassIds', []);
                $total = CourseClass::query()
                    ->where('tenant_id', $this->user()->tenant_id)
                    ->whereIn('id', is_array($classIds) ? $classIds : [])
                    ->sum('monthly_price');
            }

            if ($amountPaid >= (float) $total) {
                $validator->errors()->add('amountPaid', "Un paiement partiel doit être inférieur au total à payer.");
            }
        });
    }
}
