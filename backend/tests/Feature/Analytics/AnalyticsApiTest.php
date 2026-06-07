<?php

namespace Tests\Feature\Analytics;

use App\Domains\Finance\Models\Payment;
use App\Domains\Planning\Models\ClassSession;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\SessionAttendance;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Teachers\Models\Teacher;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_returns_real_tenant_scoped_aggregates(): void
    {
        [$tenant, $user, $student, $class, $teacher] = $this->analyticsContext();
        $otherTenant = Tenant::factory()->create();

        Enrollment::create([
            'tenant_id' => $tenant->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'enrolled_at' => now(),
        ]);
        Payment::create([
            'tenant_id' => $tenant->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'period_month' => now()->startOfMonth(),
            'amount' => 350,
            'status' => 'paid',
            'method' => 'Espèces',
            'paid_at' => now(),
        ]);
        Payment::create([
            'tenant_id' => $otherTenant->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'period_month' => now()->startOfMonth(),
            'amount' => 999,
            'status' => 'paid',
            'method' => 'Espèces',
            'paid_at' => now(),
        ]);

        $session = ClassSession::create([
            'tenant_id' => $tenant->id,
            'class_id' => $class->id,
            'day' => 1,
            'start_hour' => 10,
            'end_hour' => 12,
        ]);
        SessionAttendance::create([
            'tenant_id' => $tenant->id,
            'class_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'present',
        ]);

        $this->actingAs($user)
            ->getJson('/api/v1/analytics/report?period=last_3_months')
            ->assertOk()
            ->assertJsonPath('data.summary.totalRevenue', 350)
            ->assertJsonPath('data.summary.totalStudents', 1)
            ->assertJsonPath('data.summary.activeTeachers', 1)
            ->assertJsonPath('data.summary.attendanceRate', 100)
            ->assertJsonPath('data.teacherPerformance.0.name', $teacher->user->name)
            ->assertJsonPath('data.teacherPerformance.0.collectedRevenue', 350);
    }

    public function test_report_rejects_unknown_period(): void
    {
        [, $user] = $this->analyticsContext();

        $this->actingAs($user)
            ->getJson('/api/v1/analytics/report?period=invalid')
            ->assertUnprocessable();
    }

    private function analyticsContext(): array
    {
        $tenant = Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $teacherUser = User::factory()->for($tenant)->create(['name' => 'Nadia Alami']);
        $teacher = Teacher::create([
            'tenant_id' => $tenant->id,
            'user_id' => $teacherUser->id,
            'is_active' => true,
        ]);
        $student = Student::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'student_code' => 'ETD-'.Str::upper(Str::random(6)),
            'first_name' => 'Sara',
            'last_name' => 'Amrani',
            'is_active' => true,
        ]);
        $class = CourseClass::create([
            'tenant_id' => $tenant->id,
            'teacher_id' => $teacher->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Mathématiques',
            'subject' => 'Mathématiques',
            'monthly_price' => 350,
            'is_active' => true,
        ]);

        return [$tenant, $user, $student, $class, $teacher->load('user')];
    }
}
