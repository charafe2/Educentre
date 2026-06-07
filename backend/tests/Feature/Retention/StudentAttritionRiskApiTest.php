<?php

namespace Tests\Feature\Retention;

use App\Domains\Finance\Models\Payment;
use App\Domains\Planning\Models\ClassSession;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\SessionAttendance;
use App\Domains\Students\Models\Student;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class StudentAttritionRiskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_is_at_risk_at_exactly_eighty_percent_absence_with_late_payment(): void
    {
        [$tenant, $user, $student, $class, $session] = $this->context();

        $this->addAttendances($tenant->id, $student->id, $class->id, [
            'absent', 'absent', 'absent', 'absent', 'present',
        ]);
        $this->addPayment($tenant->id, $student->id, $class->id, 'overdue', now()->startOfMonth());

        $this->actingAs($user)
            ->getJson('/api/v1/retention/student-risks')
            ->assertOk()
            ->assertJsonPath('data.rule.conditionsOperator', 'and')
            ->assertJsonPath('data.students.0.studentUuid', $student->uuid)
            ->assertJsonPath('data.students.0.absenceRate', 80)
            ->assertJsonPath('data.students.0.absenceCount', 4)
            ->assertJsonPath('data.students.0.attendanceCount', 5)
            ->assertJsonPath('data.students.0.paymentIssue.status', 'overdue');
    }

    public function test_both_absence_and_payment_conditions_are_required(): void
    {
        [$tenant, $user, $student, $class, $session] = $this->context();
        [, , $paidStudent] = $this->context($tenant, $class, $session);
        [, , $lowAbsenceStudent] = $this->context($tenant, $class, $session);
        [, , $futurePaymentStudent] = $this->context($tenant, $class, $session);

        $this->addAttendances($tenant->id, $student->id, $class->id, ['absent', 'absent', 'absent', 'absent', 'present']);
        $this->addAttendances($tenant->id, $paidStudent->id, $class->id, ['absent', 'absent', 'absent', 'absent', 'present']);
        $this->addAttendances($tenant->id, $lowAbsenceStudent->id, $class->id, ['absent', 'absent', 'absent', 'present', 'present']);
        $this->addAttendances($tenant->id, $futurePaymentStudent->id, $class->id, ['absent', 'absent', 'absent', 'absent', 'present']);

        $this->addPayment($tenant->id, $student->id, $class->id, 'pending', now()->startOfMonth());
        $this->addPayment($tenant->id, $paidStudent->id, $class->id, 'paid', now()->startOfMonth());
        $this->addPayment($tenant->id, $lowAbsenceStudent->id, $class->id, 'overdue', now()->startOfMonth());
        $this->addPayment($tenant->id, $futurePaymentStudent->id, $class->id, 'pending', now()->addMonth()->startOfMonth());

        $this->actingAs($user)
            ->getJson('/api/v1/retention/student-risks')
            ->assertOk()
            ->assertJsonCount(1, 'data.students')
            ->assertJsonPath('data.students.0.studentUuid', $student->uuid);
    }

    public function test_old_attendance_and_other_tenant_data_are_ignored(): void
    {
        [$tenant, $user, $student, $class, $session] = $this->context();
        [$otherTenant, , $otherStudent, $otherClass, $otherSession] = $this->context();

        $this->addAttendances($tenant->id, $student->id, $class->id, ['absent', 'absent', 'absent', 'absent', 'present'], now()->subDays(16));
        $this->addPayment($tenant->id, $student->id, $class->id, 'overdue', now()->startOfMonth());

        $this->addAttendances($otherTenant->id, $otherStudent->id, $otherClass->id, ['absent']);
        $this->addPayment($otherTenant->id, $otherStudent->id, $otherClass->id, 'overdue', now()->startOfMonth());

        $this->actingAs($user)
            ->getJson('/api/v1/retention/student-risks')
            ->assertOk()
            ->assertJsonCount(0, 'data.students');
    }

    private function context(
        ?Tenant $tenant = null,
        ?CourseClass $class = null,
        ?ClassSession $session = null,
    ): array {
        $tenant ??= Tenant::factory()->create();
        $user = User::factory()->for($tenant)->create();
        $student = Student::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'student_code' => 'ETD-'.Str::upper(Str::random(6)),
            'first_name' => 'Sara',
            'last_name' => 'Amrani',
            'is_active' => true,
        ]);
        $class ??= CourseClass::create([
            'tenant_id' => $tenant->id,
            'uuid' => (string) Str::uuid(),
            'name' => 'Mathématiques',
            'subject' => 'Mathématiques',
            'monthly_price' => 350,
            'is_active' => true,
        ]);
        $session ??= ClassSession::create([
            'tenant_id' => $tenant->id,
            'class_id' => $class->id,
            'day' => 1,
            'start_hour' => 10,
            'end_hour' => 12,
        ]);

        return [$tenant, $user, $student, $class, $session];
    }

    private function addAttendances(
        int $tenantId,
        int $studentId,
        int $classId,
        array $statuses,
        mixed $createdAt = null,
    ): void {
        foreach ($statuses as $index => $status) {
            $session = ClassSession::create([
                'tenant_id' => $tenantId,
                'class_id' => $classId,
                'day' => ($index % 7) + 1,
                'start_hour' => 8,
                'end_hour' => 9,
            ]);
            $attendance = SessionAttendance::create([
                'tenant_id' => $tenantId,
                'class_session_id' => $session->id,
                'student_id' => $studentId,
                'attended_on' => now()->toDateString(),
                'status' => $status,
            ]);

            if ($createdAt !== null) {
                DB::table('session_attendances')
                    ->where('id', $attendance->id)
                    ->update(['attended_on' => $createdAt->copy()->addMinutes($index)->toDateString()]);
            }
        }
    }

    private function addPayment(int $tenantId, int $studentId, int $classId, string $status, mixed $periodMonth): void
    {
        Payment::create([
            'tenant_id' => $tenantId,
            'student_id' => $studentId,
            'class_id' => $classId,
            'period_month' => $periodMonth,
            'amount' => 350,
            'status' => $status,
            'method' => $status === 'paid' ? 'Espèces' : null,
            'paid_at' => $status === 'paid' ? now() : null,
        ]);
    }
}
