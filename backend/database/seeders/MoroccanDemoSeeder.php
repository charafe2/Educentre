<?php

namespace Database\Seeders;

use App\Models\Tenant;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MoroccanDemoSeeder extends Seeder
{
    private const STUDENT_COUNT = 180;

    private const RISK_STUDENT_COUNT = 24;

    public function run(): void
    {
        $tenant = Tenant::query()->where('slug', 'moujtahid')->firstOrFail();
        $now = CarbonImmutable::now();

        DB::transaction(function () use ($tenant, $now) {
            $this->removePreviousDemoData($tenant->id);

            $roomIds = $this->createRooms($tenant->id, $now);
            $teacherIds = $this->createTeachers($tenant->id, $now);
            $classes = $this->createClasses($tenant->id, $teacherIds, $roomIds, $now);
            $sessionIds = $this->createSessions($tenant->id, $classes, $now);
            $students = $this->createStudents($tenant->id, $classes, $now);

            $this->createParents($tenant->id, $students, $now);
            $this->createEnrollments($tenant->id, $students, $classes, $now);
            $this->createPayments($tenant->id, $students, $classes, $now);
            $this->createAttendances($tenant->id, $students, $sessionIds, $now);
        });

        $this->command?->info(sprintf(
            'Données marocaines créées : %d élèves, %d classes, %d professeurs, %d élèves à risque.',
            self::STUDENT_COUNT,
            24,
            14,
            self::RISK_STUDENT_COUNT,
        ));
    }

    private function removePreviousDemoData(int $tenantId): void
    {
        $studentIds = DB::table('students')
            ->where('tenant_id', $tenantId)
            ->where('student_code', 'like', 'DEMO-%')
            ->pluck('id');
        $classIds = DB::table('classes')
            ->where('tenant_id', $tenantId)
            ->where('name', 'like', 'Démo · %')
            ->pluck('id');
        $teacherUserIds = DB::table('users')
            ->where('tenant_id', $tenantId)
            ->where('email', 'like', 'demo.prof.%@moujtahid.ma')
            ->pluck('id');

        DB::table('students')->whereIn('id', $studentIds)->delete();
        DB::table('classes')->whereIn('id', $classIds)->delete();
        DB::table('teachers')->whereIn('user_id', $teacherUserIds)->delete();
        DB::table('users')->whereIn('id', $teacherUserIds)->delete();
        DB::table('rooms')
            ->where('tenant_id', $tenantId)
            ->where('name', 'like', 'Démo · %')
            ->delete();
    }

    private function createRooms(int $tenantId, CarbonImmutable $now): array
    {
        $rooms = collect(range(1, 12))->map(fn (int $number) => [
            'tenant_id' => $tenantId,
            'uuid' => (string) Str::uuid(),
            'name' => sprintf('Démo · Salle %02d', $number),
            'capacity' => 22 + (($number % 4) * 4),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        DB::table('rooms')->insert($rooms);

        return DB::table('rooms')
            ->where('tenant_id', $tenantId)
            ->where('name', 'like', 'Démo · %')
            ->orderBy('name')
            ->pluck('id')
            ->all();
    }

    private function createTeachers(int $tenantId, CarbonImmutable $now): array
    {
        $names = [
            'Youssef El Mansouri', 'Salma Benjelloun', 'Mehdi Alaoui', 'Imane Berrada',
            'Omar Amrani', 'Nadia Tazi', 'Hamza Idrissi', 'Sara Chraibi',
            'Anas Lahlou', 'Meryem Sqalli', 'Ayoub Fassi', 'Hajar Bennani',
            'Zakaria El Fassi', 'Ghita Lamrani',
        ];
        $specialties = [
            'Mathématiques', 'Physique-Chimie', 'Français', 'Anglais', 'SVT',
            'Arabe', 'Économie', 'Comptabilité', 'Informatique', 'Philosophie',
        ];

        foreach ($names as $index => $name) {
            $userId = DB::table('users')->insertGetId([
                'tenant_id' => $tenantId,
                'uuid' => (string) Str::uuid(),
                'name' => $name,
                'email' => sprintf('demo.prof.%02d@moujtahid.ma', $index + 1),
                'email_verified_at' => $now,
                'password' => Hash::make('demo123456789'),
                'role' => 'teacher',
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('teachers')->insert([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'uuid' => (string) Str::uuid(),
                'specialty' => $specialties[$index % count($specialties)],
                'payment_mode' => $index % 3 === 0 ? 'per_student' : 'fixed',
                'fixed_monthly_salary' => $index % 3 === 0 ? null : 4200 + ($index * 180),
                'rate_per_student' => $index % 3 === 0 ? 120 : null,
                'min_students_threshold' => 8,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return DB::table('teachers')
            ->join('users', 'users.id', '=', 'teachers.user_id')
            ->where('teachers.tenant_id', $tenantId)
            ->where('users.email', 'like', 'demo.prof.%@moujtahid.ma')
            ->orderBy('users.email')
            ->pluck('teachers.id')
            ->all();
    }

    private function createClasses(int $tenantId, array $teacherIds, array $roomIds, CarbonImmutable $now): array
    {
        $subjects = [
            ['Mathématiques', '3ème Collège'], ['Français', '3ème Collège'],
            ['Mathématiques', 'Tronc Commun'], ['Physique-Chimie', 'Tronc Commun'],
            ['Français', 'Tronc Commun'], ['Anglais', 'Tronc Commun'],
            ['Mathématiques', '1ère Bac'], ['Physique-Chimie', '1ère Bac'],
            ['SVT', '1ère Bac'], ['Français', '1ère Bac'], ['Anglais', '1ère Bac'],
            ['Économie', '1ère Bac'], ['Mathématiques', '2ème Bac Sciences'],
            ['Physique-Chimie', '2ème Bac Sciences'], ['SVT', '2ème Bac Sciences'],
            ['Philosophie', '2ème Bac'], ['Anglais', '2ème Bac'],
            ['Économie', '2ème Bac Gestion'], ['Comptabilité', '2ème Bac Gestion'],
            ['Informatique', 'Initiation'], ['Arabe', 'Collège'], ['Français', 'Primaire'],
            ['Mathématiques', 'Primaire'], ['Préparation concours', 'Post-Bac'],
        ];

        foreach ($subjects as $index => [$subject, $level]) {
            DB::table('classes')->insert([
                'tenant_id' => $tenantId,
                'teacher_id' => $teacherIds[$index % count($teacherIds)],
                'room_id' => $roomIds[$index % count($roomIds)],
                'uuid' => (string) Str::uuid(),
                'name' => sprintf('Démo · %s %s · G%d', $subject, $level, ($index % 3) + 1),
                'subject' => $subject,
                'level' => $level,
                'max_capacity' => 24 + (($index % 4) * 4),
                'monthly_price' => 280 + (($index % 7) * 40),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return DB::table('classes')
            ->where('tenant_id', $tenantId)
            ->where('name', 'like', 'Démo · %')
            ->orderBy('id')
            ->get(['id', 'monthly_price'])
            ->map(fn ($class) => ['id' => $class->id, 'monthly_price' => (float) $class->monthly_price])
            ->all();
    }

    private function createSessions(int $tenantId, array $classes, CarbonImmutable $now): array
    {
        $sessionIds = [];

        foreach ($classes as $index => $class) {
            $sessionIds[$index] = DB::table('class_sessions')->insertGetId([
                'tenant_id' => $tenantId,
                'class_id' => $class['id'],
                'uuid' => (string) Str::uuid(),
                'day' => ($index % 6) + 1,
                'start_hour' => 9 + (($index % 5) * 2),
                'end_hour' => 11 + (($index % 5) * 2),
                'is_cancelled' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        return $sessionIds;
    }

    private function createStudents(int $tenantId, array $classes, CarbonImmutable $now): array
    {
        $firstNames = [
            'Adam', 'Aya', 'Yassine', 'Lina', 'Amine', 'Salma', 'Ilyas', 'Nour',
            'Othmane', 'Meryem', 'Anas', 'Sara', 'Mehdi', 'Ghita', 'Ayoub', 'Hiba',
            'Hamza', 'Imane', 'Zakaria', 'Kenza', 'Rayan', 'Malak', 'Ismail', 'Chaimae',
        ];
        $lastNames = [
            'Alaoui', 'Berrada', 'El Mansouri', 'Idrissi', 'Benjelloun', 'Amrani',
            'Tazi', 'Chraibi', 'Fassi', 'Lahlou', 'Bennani', 'Sqalli',
            'Lamrani', 'El Fassi', 'Kadiri', 'Naciri', 'Zerouali', 'Belkadi',
        ];
        $schools = [
            'Lycée Mohammed V', 'Lycée Moulay Youssef', 'Groupe scolaire Al Madina',
            'Lycée Ibn Rochd', 'École Al Jabr', 'Lycée Al Khansaa',
            'Groupe scolaire La Résidence', 'Lycée Hassan II',
        ];
        $levels = ['3ème Collège', 'Tronc Commun', '1ère Bac', '2ème Bac Sciences', '2ème Bac Gestion'];
        $students = [];

        for ($index = 0; $index < self::STUDENT_COUNT; $index++) {
            $studentId = DB::table('students')->insertGetId([
                'tenant_id' => $tenantId,
                'uuid' => (string) Str::uuid(),
                'student_code' => sprintf('DEMO-%04d', $index + 1),
                'first_name' => $firstNames[$index % count($firstNames)],
                'last_name' => $lastNames[($index * 5) % count($lastNames)],
                'birth_date' => $now->subYears(9 + ($index % 10))->subDays($index % 300)->toDateString(),
                'school_level' => $levels[$index % count($levels)],
                'current_school' => $schools[$index % count($schools)],
                'emergency_contact' => sprintf('06%08d', 10000000 + $index),
                'status' => 'active',
                'is_active' => true,
                'created_at' => $now->subMonths($index % 8)->subDays($index % 20),
                'updated_at' => $now,
            ]);

            $students[] = [
                'id' => $studentId,
                'index' => $index,
                'primary_class_index' => $index % count($classes),
                'secondary_class_index' => ($index + 7) % count($classes),
                'is_risk' => $index < self::RISK_STUDENT_COUNT,
            ];
        }

        return $students;
    }

    private function createParents(int $tenantId, array $students, CarbonImmutable $now): void
    {
        $parentFirstNames = ['Mohamed', 'Fatima', 'Rachid', 'Khadija', 'Hassan', 'Naima', 'Karim', 'Souad'];
        $lastNames = ['Alaoui', 'Berrada', 'El Mansouri', 'Idrissi', 'Benjelloun', 'Amrani', 'Tazi', 'Chraibi'];
        $rows = [];

        foreach ($students as $student) {
            $rows[] = [
                'tenant_id' => $tenantId,
                'student_id' => $student['id'],
                'uuid' => (string) Str::uuid(),
                'first_name' => $parentFirstNames[$student['index'] % count($parentFirstNames)],
                'last_name' => $lastNames[$student['index'] % count($lastNames)],
                'phone' => sprintf('06%08d', 20000000 + $student['index']),
                'whatsapp_phone' => sprintf('06%08d', 20000000 + $student['index']),
                'email' => sprintf('parent.demo.%04d@example.ma', $student['index'] + 1),
                'relation' => $student['index'] % 2 === 0 ? 'father' : 'mother',
                'is_primary' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('parents')->insert($rows);
    }

    private function createEnrollments(int $tenantId, array $students, array $classes, CarbonImmutable $now): void
    {
        $rows = [];

        foreach ($students as $student) {
            foreach ([$student['primary_class_index'], $student['secondary_class_index']] as $offset => $classIndex) {
                $rows[] = [
                    'tenant_id' => $tenantId,
                    'student_id' => $student['id'],
                    'class_id' => $classes[$classIndex]['id'],
                    'uuid' => (string) Str::uuid(),
                    'enrolled_at' => $now->subMonths($student['index'] % 8)->subDays($offset * 3),
                    'status' => 'active',
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('enrollments')->insert($rows);
    }

    private function createPayments(int $tenantId, array $students, array $classes, CarbonImmutable $now): void
    {
        $rows = [];

        foreach ($students as $student) {
            foreach ([$student['primary_class_index'], $student['secondary_class_index']] as $classIndex) {
                for ($monthOffset = 6; $monthOffset >= 0; $monthOffset--) {
                    $period = $now->subMonths($monthOffset)->startOfMonth();
                    $status = $this->paymentStatus($student['index'], $monthOffset, $student['is_risk']);
                    $paidAt = $status === 'paid'
                        ? $period->addDays(3 + (($student['index'] + $monthOffset) % 12))
                        : null;

                    $rows[] = [
                        'tenant_id' => $tenantId,
                        'student_id' => $student['id'],
                        'class_id' => $classes[$classIndex]['id'],
                        'uuid' => (string) Str::uuid(),
                        'period_month' => $period->toDateString(),
                        'amount' => $classes[$classIndex]['monthly_price'],
                        'status' => $status,
                        'method' => $status === 'paid' ? ['cash', 'bank_transfer', 'card'][$student['index'] % 3] : null,
                        'paid_at' => $paidAt?->toDateString(),
                        'note' => $status === 'overdue' ? 'Relance parent à effectuer' : null,
                        'invoice_generated' => $status === 'paid',
                        'created_at' => $period->addDays(1),
                        'updated_at' => $now,
                    ];
                }
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('payments')->insert($chunk);
        }
    }

    private function paymentStatus(int $studentIndex, int $monthOffset, bool $isRisk): string
    {
        if ($isRisk && $monthOffset <= 1) {
            return $studentIndex % 2 === 0 ? 'overdue' : 'pending';
        }

        if ($monthOffset === 0 && $studentIndex % 11 === 0) {
            return 'pending';
        }

        if ($monthOffset <= 1 && $studentIndex % 17 === 0) {
            return 'overdue';
        }

        return 'paid';
    }

    private function createAttendances(int $tenantId, array $students, array $sessionIds, CarbonImmutable $now): void
    {
        $rows = [];
        $recentDates = collect(range(0, 7))->map(fn (int $offset) => $now->subDays($offset * 2)->toDateString());
        $historicalDates = collect(range(1, 5))->flatMap(fn (int $monthOffset) => collect([5, 12, 19, 26])
            ->map(fn (int $day) => $now->subMonths($monthOffset)->startOfMonth()->addDays($day - 1)->toDateString()));

        foreach ($students as $student) {
            $dates = $recentDates->concat($historicalDates)->unique()->values();

            foreach ($dates as $position => $date) {
                $status = $this->attendanceStatus($student['index'], $position, $student['is_risk'], $position < 8);
                $rows[] = [
                    'tenant_id' => $tenantId,
                    'class_session_id' => $sessionIds[$student['primary_class_index']],
                    'student_id' => $student['id'],
                    'attended_on' => $date,
                    'uuid' => (string) Str::uuid(),
                    'status' => $status,
                    'notes' => $status === 'absent' && $student['is_risk'] ? 'Absence non justifiée' : null,
                    'created_at' => $date,
                    'updated_at' => $now,
                ];
            }
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('session_attendances')->insert($chunk);
        }
    }

    private function attendanceStatus(int $studentIndex, int $position, bool $isRisk, bool $isRecent): string
    {
        if ($isRisk && $isRecent) {
            return $position === 0 ? 'present' : 'absent';
        }

        $score = ($studentIndex * 7 + $position * 3) % 20;

        return match (true) {
            $score < 15 => 'present',
            $score < 17 => 'late',
            default => 'absent',
        };
    }
}
