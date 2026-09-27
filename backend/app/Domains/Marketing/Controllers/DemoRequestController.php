<?php

namespace App\Domains\Marketing\Controllers;

use App\Domains\Marketing\Requests\StoreDemoRequestRequest;
use App\Http\Controllers\Controller;
use App\Mail\DemoRequestMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;

class DemoRequestController extends Controller
{
    /** Recipient is a fixed business address, not per-tenant config — same
     *  treatment as MAIL_FROM_ADDRESS, just for the other direction. */
    private const RECIPIENT = 'contact@moujtahide.ma';

    public function store(StoreDemoRequestRequest $request): JsonResponse
    {
        $data = $request->validated();

        Mail::to(self::RECIPIENT)->send(new DemoRequestMail(
            centreName: $data['centreName'],
            fullName: $data['fullName'],
            phone: $data['phone'],
            centreSize: $data['centreSize'] ?? null,
            city: $data['city'] ?? null,
        ));

        return $this->success(message: 'Votre demande a bien été envoyée.');
    }
}
