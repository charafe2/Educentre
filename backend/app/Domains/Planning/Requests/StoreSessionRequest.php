<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'classeId' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where('tenant_id', $tenantId),
            ],
            'day' => ['required', 'integer', 'between:0,5'],
            'startHour' => ['required', 'integer', 'between:0,23'],
            'endHour' => ['required', 'integer', 'between:1,24', 'gt:startHour'],
            'isCancelled' => ['sometimes', 'boolean'],
            'cancelReason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
