<?php

namespace App\Domains\Students\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
}
