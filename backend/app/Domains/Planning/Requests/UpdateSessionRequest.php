<?php

namespace App\Domains\Planning\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSessionRequest extends FormRequest
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
                'sometimes',
                'integer',
                Rule::exists('classes', 'id')->where('tenant_id', $tenantId),
            ],
            'day' => ['sometimes', 'integer', 'between:0,5'],
            'startHour' => ['sometimes', 'integer', 'between:0,23'],
            'endHour' => ['sometimes', 'integer', 'between:1,24'],
            'isCancelled' => ['sometimes', 'boolean'],
            'cancelReason' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (!$this->has('startHour') || !$this->has('endHour')) {
                return;
            }

            if ($this->integer('endHour') <= $this->integer('startHour')) {
                $validator->errors()->add('endHour', 'L heure de fin doit etre apres l heure de debut.');
            }
        });
    }
}
