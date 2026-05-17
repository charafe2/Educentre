<?php

namespace App\Domains\Teachers\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTeacherRequest extends FormRequest
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
            'email' => ['required', 'email', 'unique:users,email'],
            'specialty' => ['nullable', 'string', 'max:255'],
            'paymentMode' => ['nullable', 'string', 'in:fixed,per_student'],
            'fixedSalary' => ['nullable', 'numeric', 'min:0'],
            'ratePerStudent' => ['nullable', 'numeric', 'min:0'],
            'iban' => ['nullable', 'string', 'max:34'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'firstName.required' => 'Le prénom est obligatoire.',
            'lastName.required' => 'Le nom est obligatoire.',
            'email.required' => 'L\'email est obligatoire.',
            'email.unique' => 'Cet email est déjà utilisé.',
            'paymentMode.in' => 'Le mode de paiement doit être fixed ou per_student.',
        ];
    }
}
