<?php

namespace App\Domains\Students\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'firstName' => ['nullable', 'string', 'max:255'],
            'lastName' => ['nullable', 'string', 'max:255'],
            'birthDate' => ['nullable', 'date'],
            'school' => ['nullable', 'string', 'max:255'],
            'level' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,inactive'],
            'enrolledClassIds' => ['nullable', 'array'],
            'enrolledClassIds.*' => ['integer', 'exists:classes,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'enrolledClassIds.*.exists' => 'Une ou plusieurs classes sélectionnées n\'existent pas.',
        ];
    }
}
