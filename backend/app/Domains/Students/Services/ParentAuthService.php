<?php

namespace App\Domains\Students\Services;

use App\Domains\Students\DTOs\ParentLoginDTO;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Models\StudentParent;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;

class ParentAuthService
{
    public function login(ParentLoginDTO $dto, string $throttleKey): array
    {
        // One `parents` row exists per (student, phone) pair, so a parent
        // with several kids has several rows sharing the same phone —
        // check the password against each until one matches.
        $candidates = StudentParent::where('phone', $dto->phone)->get();
        $parent = $candidates->first(fn (StudentParent $p) => $p->password && Hash::check($dto->password, $p->password));

        if ($parent === null) {
            RateLimiter::hit($throttleKey);
            throw new AuthenticationException('Téléphone ou mot de passe incorrect.');
        }

        RateLimiter::clear($throttleKey);

        $token = $parent->createToken('parent-auth-token', ['*'], now()->addDays(30))->plainTextToken;

        return [
            'parent' => $parent,
            'children' => $this->childrenFor($parent),
            'token' => $token,
        ];
    }

    public function childrenFor(StudentParent $parent): Collection
    {
        $studentIds = StudentParent::where('tenant_id', $parent->tenant_id)
            ->where('phone', $parent->phone)
            ->pluck('student_id');

        return Student::whereIn('id', $studentIds)
            ->with(['enrollments', 'payments', 'parents'])
            ->get();
    }
}
