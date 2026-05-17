<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MoveStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'studentId' => ['required', 'integer', 'exists:students,id'],
            'fromGroupId' => ['nullable', 'integer', 'exists:groups,id'],
            'toGroupId' => ['required', 'integer', 'exists:groups,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'studentId.required' => 'L\'étudiant est obligatoire.',
            'studentId.exists' => 'L\'étudiant sélectionné n\'existe pas.',
            'toGroupId.required' => 'Le groupe de destination est obligatoire.',
            'toGroupId.exists' => 'Le groupe de destination n\'existe pas.',
            'fromGroupId.exists' => 'Le groupe source n\'existe pas.',
        ];
    }
}
