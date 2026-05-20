<?php

namespace App\Domains\Teachers\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTeacherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $teacherId = $this->route('id');

        return [
            'firstName' => ['nullable', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($teacherId, 'id')],
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
            'email.unique' => 'Cet email est déjà utilisé.',
            'paymentMode.in' => 'Le mode de paiement doit être fixed ou per_student.',
        ];
    }
}
