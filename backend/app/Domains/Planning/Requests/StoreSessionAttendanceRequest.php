<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSessionAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'attendedOn' => ['nullable', 'date', 'before_or_equal:today'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.studentId' => [
                'required',
                'integer',
                Rule::exists('students', 'id')->where('tenant_id', $tenantId),
            ],
            'records.*.status' => [
                'required',
                'string',
                Rule::in(['present', 'absent', 'late', 'excused']),
            ],
            'records.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
