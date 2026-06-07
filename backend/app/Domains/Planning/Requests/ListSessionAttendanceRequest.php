<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ListSessionAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }
}
