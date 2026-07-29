<?php

namespace App\Domains\Students\DTOs;

class ParentLoginDTO
{
    public function __construct(
        public readonly string $phone,
        public readonly string $password,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            phone: $data['phone'],
            password: $data['password'],
        );
    }
}
