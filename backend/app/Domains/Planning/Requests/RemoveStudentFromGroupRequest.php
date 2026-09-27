<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RemoveStudentFromGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'studentId' => ['required', 'integer', 'exists:students,id'],
            'groupId' => ['required', 'integer', 'exists:groups,id'],
        ];
    }
}
