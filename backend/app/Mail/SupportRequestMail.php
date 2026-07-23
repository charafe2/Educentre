<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupportRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $sender,
        public readonly string $subjectLine,
        public readonly string $messageBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "[Support Moujtahid] {$this->subjectLine}",
            replyTo: [$this->sender->email],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.support-request',
            with: [
                'senderName' => $this->sender->name,
                'senderEmail' => $this->sender->email,
                'centreName' => $this->sender->centre?->name ?? '—',
                'subjectLine' => $this->subjectLine,
                'messageBody' => $this->messageBody,
            ],
        );
    }
}
