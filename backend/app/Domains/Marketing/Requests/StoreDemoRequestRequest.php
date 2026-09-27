<?php

namespace App\Domains\Marketing\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Public landing-page lead form — no auth, so keep this lenient: the visitor
 *  isn't a tenant user yet, there's nothing here to look up or cross-check. */
class StoreDemoRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'centreName' => ['required', 'string', 'max:150'],
            'fullName' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:40'],
            'centreSize' => ['nullable', 'string', 'max:60'],
            'city' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'centreName.required' => 'Le nom du centre est requis.',
            'fullName.required' => 'Votre nom est requis.',
            'phone.required' => 'Le numéro de téléphone est requis.',
        ];
    }
}
