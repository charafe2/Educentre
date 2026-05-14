<?php

return [
    'driver' => 'argon2id',
    'argon' => [
        'memory' => 65536,
        'time' => 4,
        'threads' => 3,
    ],
];
