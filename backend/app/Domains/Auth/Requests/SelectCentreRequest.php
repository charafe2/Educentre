<?php

namespace App\Domains\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SelectCentreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'centreUuid' => ['required', 'uuid', 'exists:centres,uuid'],
        ];
    }

    public function messages(): array
    {
        return [
            'centreUuid.required' => 'Veuillez sélectionner un centre.',
            'centreUuid.exists' => 'Ce centre est introuvable.',
        ];
    }
}
