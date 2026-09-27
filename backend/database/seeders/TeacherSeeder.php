<?php

namespace Database\Seeders;

use App\Domains\Teachers\Models\Teacher;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TeacherSeeder extends Seeder
{
    /**
     * [name, specialty, payment mode, amount]. The amount is the monthly
     * salary (fixed), the rate per student (per_student) or the share of
     * class revenue in % (percentage). Specialties match SubjectSeeder names.
     */
    private const TEACHERS = [
        ['Youssef El Mansouri', 'Mathématiques', 'fixed', 5200],
        ['Salma Benjelloun', 'Physique-Chimie', 'percentage', 40],
        ['Mehdi Alaoui', 'SVT', 'per_student', 120],
        ['Imane Berrada', 'Français', 'fixed', 4600],
        ['Omar Amrani', 'Anglais', 'percentage', 35],
        ['Nadia Tazi', 'Arabe', 'per_student', 100],
        ['Hamza Idrissi', 'Philosophie', 'fixed', 4200],
        ['Sara Chraibi', 'Économie', 'percentage', 45],
        ['Anas Lahlou', 'Comptabilité', 'per_student', 110],
        ['Meryem Sqalli', 'Informatique', 'fixed', 4800],
    ];

    /**
     * Idempotent per tenant: teachers are keyed on their email, so re-running
     * updates them in place instead of creating duplicates.
     */
    public function run(string $tenantSlug = 'moujtahid'): void
    {
        $tenant = Tenant::query()->where('slug', $tenantSlug)->firstOrFail();

        DB::transaction(function () use ($tenant) {
            foreach (self::TEACHERS as $index => [$name, $specialty, $mode, $amount]) {
                $user = User::query()->updateOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'email' => sprintf('prof.%02d.%s@demo.ma', $index + 1, $tenant->slug),
                    ],
                    [
                        'name' => $name,
                        'password' => Hash::make('prof123456789'),
                        'role' => 'teacher',
                        'status' => 'active',
                    ],
                );

                Teacher::query()->updateOrCreate(
                    ['tenant_id' => $tenant->id, 'user_id' => $user->id],
                    [
                        'specialty' => $specialty,
                        'payment_mode' => $mode,
                        'fixed_monthly_salary' => $mode === 'fixed' ? $amount : null,
                        'rate_per_student' => $mode === 'per_student' ? $amount : null,
                        'percentage_rate' => $mode === 'percentage' ? $amount : null,
                        'min_students_threshold' => 0,
                        'is_active' => true,
                    ],
                );
            }
        });

        $this->command?->info(sprintf(
            '%d professeurs créés pour le centre « %s ».',
            count(self::TEACHERS),
            $tenant->name,
        ));
    }
}
