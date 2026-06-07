<?php

namespace App\Domains\Analytics\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AnalyticsReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'period' => ['nullable', Rule::in(['last_3_months', 'last_6_months', 'this_year', 'last_year'])],
        ];
    }
}
