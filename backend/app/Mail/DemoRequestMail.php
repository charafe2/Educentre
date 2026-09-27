<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DemoRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $centreName,
        public readonly string $fullName,
        public readonly string $phone,
        public readonly ?string $centreSize,
        public readonly ?string $city,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Démo Moujtahid] {$this->centreName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.demo-request',
            with: [
                'centreName' => $this->centreName,
                'fullName' => $this->fullName,
                'phone' => $this->phone,
                'centreSize' => $this->centreSize ?: 'Non renseignée',
                'city' => $this->city ?: 'Non renseignée',
            ],
        );
    }
}
