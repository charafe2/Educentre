<?php

namespace App\Domains\Auth\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'SaaS ERP API',
    description: 'API de gestion multi-tenant pour centres éducatifs',
    contact: new OA\Contact(email: 'support@moujtahid.ma'),
)]
#[OA\Server(
    url: 'http://localhost:8000/api/v1',
    description: 'Serveur de développement local',
)]
class OpenapiSpec
{
}
