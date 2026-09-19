<?php

namespace App\Domains\Settings\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendSupportRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required' => "L'objectif de votre demande est obligatoire.",
            'message.required' => 'Merci de décrire votre demande.',
            'message.min' => 'Votre message doit contenir au moins 10 caractères.',
        ];
    }
}
