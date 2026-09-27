<?php

namespace App\Domains\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', 'max:255'],
            'city' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string', 'max:500'],
            'phone' => ['sometimes', 'string', 'max:50'],
            'whatsapp' => ['sometimes', 'string', 'max:50'],
            'logo' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'website' => ['sometimes', 'nullable', 'string', 'max:255'],
            'ice' => ['sometimes', 'nullable', 'string', 'max:50'],
            'ifNumber' => ['sometimes', 'nullable', 'string', 'max:50'],
            'rc' => ['sometimes', 'nullable', 'string', 'max:50'],
            'patente' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.max' => 'Le nom du centre ne doit pas dépasser 255 caractères.',
            'type.max' => 'Le type ne doit pas dépasser 255 caractères.',
            'city.max' => 'La ville ne doit pas dépasser 255 caractères.',
            'address.max' => 'L\'adresse ne doit pas dépasser 500 caractères.',
            'phone.max' => 'Le téléphone ne doit pas dépasser 50 caractères.',
            'whatsapp.max' => 'Le WhatsApp ne doit pas dépasser 50 caractères.',
            'email.email' => 'L\'adresse email n\'est pas valide.',
        ];
    }
}
