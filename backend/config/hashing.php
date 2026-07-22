<?php

return [
    'driver' => 'bcrypt',
    'argon' => [
        'memory' => 65536,
        'time' => 4,
        'threads' => 3,
    ],
];
