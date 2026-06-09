<?php

namespace App\Domains\Analytics\Services;

use App\Domains\Finance\Models\Payment;
use App\Domains\Planning\Models\CourseClass;
use App\Domains\Planning\Models\SessionAttendance;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Domains\Teachers\Models\Teacher;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Collection;

class AnalyticsService
{
    public function report(int $tenantId, string $period, int $teacherPage = 1, int $teacherPerPage = 8): array
    {
        [$start, $end] = $this->periodRange($period);
        $students = Student::query()->where('tenant_id', $tenantId)->get();
        $payments = Payment::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('period_month', [$start, $end])
            ->get();
        $attendances = SessionAttendance::query()
            ->where('tenant_id', $tenantId)
            ->whereBetween('attended_on', [$start->toDateString(), $end->toDateString()])
            ->get();

        $teacherPerformance = $this->teacherPerformance($tenantId, $start, $end);

        return [
            'period' => [
                'key' => $period,
                'start' => $start->toDateString(),
                'end' => $end->toDateString(),
            ],
            'summary' => [
                'totalRevenue' => (float) $payments->where('status', 'paid')->sum('amount'),
                'totalStudents' => $students->count(),
                'activeStudents' => $students->where('is_active', true)->count(),
                'attendanceRate' => $this->attendanceRate($attendances),
                'activeTeachers' => Teacher::query()->where('tenant_id', $tenantId)->where('is_active', true)->count(),
            ],
            'paymentDistribution' => $this->paymentDistribution($students, $payments),
            'monthlyRevenues' => $this->monthlyRevenues($payments, $start, $end),
            'classAttendance' => $this->classAttendance($tenantId, $start, $end),
            'enrollmentTrend' => $this->enrollmentTrend($tenantId, $start, $end),
            'teacherPerformance' => $teacherPerformance->forPage($teacherPage, $teacherPerPage)->values()->all(),
            'teacherPerformancePagination' => $this->paginationMeta($teacherPerformance->count(), $teacherPage, $teacherPerPage),
        ];
    }

    private function periodRange(string $period): array
    {
        $today = CarbonImmutable::today();

        return match ($period) {
            'last_3_months' => [$today->subMonths(2)->startOfMonth(), $today->endOfMonth()],
            'this_year' => [$today->startOfYear(), $today->endOfYear()],
            'last_year' => [$today->subYear()->startOfYear(), $today->subYear()->endOfYear()],
            default => [$today->subMonths(5)->startOfMonth(), $today->endOfMonth()],
        };
    }

    private function attendanceRate(Collection $attendances): float
    {
        if ($attendances->isEmpty()) {
            return 0;
        }

        return round(($attendances->whereIn('status', ['present', 'late'])->count() / $attendances->count()) * 100, 1);
    }

    private function paymentDistribution(EloquentCollection $students, EloquentCollection $payments): array
    {
        $counts = ['paid' => 0, 'pending' => 0, 'overdue' => 0];
        $paymentsByStudent = $payments->groupBy('student_id');

        foreach ($students as $student) {
            $studentPayments = $paymentsByStudent->get($student->id, collect());
            $status = 'pending';

            if ($studentPayments->contains('status', 'overdue')) {
                $status = 'overdue';
            } elseif ($studentPayments->isNotEmpty() && $studentPayments->every(fn (Payment $payment) => $payment->status === 'paid')) {
                $status = 'paid';
            }

            $counts[$status]++;
        }

        $total = $students->count();

        return [
            'paid' => $this->distributionItem($counts['paid'], $total),
            'pending' => $this->distributionItem($counts['pending'], $total),
            'overdue' => $this->distributionItem($counts['overdue'], $total),
            'total' => $total,
        ];
    }

    private function distributionItem(int $count, int $total): array
    {
        return ['count' => $count, 'pct' => $total > 0 ? (int) round(($count / $total) * 100) : 0];
    }

    private function monthlyRevenues(EloquentCollection $payments, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $revenueByMonth = $payments
            ->where('status', 'paid')
            ->groupBy(fn (Payment $payment) => $payment->period_month->format('Y-m'))
            ->map(fn (Collection $monthPayments) => (float) $monthPayments->sum('amount'));

        return $this->months($start, $end)->map(fn ($month) => [
            'month' => $month->format('Y-m'),
            'amount' => $revenueByMonth->get($month->format('Y-m'), 0),
        ])->all();
    }

    private function classAttendance(int $tenantId, CarbonImmutable $start, CarbonImmutable $end): array
    {
        return CourseClass::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with([
                'sessions' => fn ($query) => $query->where('tenant_id', $tenantId),
                'sessions.attendances' => fn ($query) => $query->where('tenant_id', $tenantId)->whereBetween('attended_on', [$start->toDateString(), $end->toDateString()]),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (CourseClass $class) => [
                'className' => $class->name,
                'rate' => $this->attendanceRate($class->sessions->flatMap->attendances),
            ])
            ->values()
            ->all();
    }

    private function enrollmentTrend(int $tenantId, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $enrollments = Enrollment::query()
            ->where('tenant_id', $tenantId)
            ->where('enrolled_at', '<=', $end)
            ->get(['student_id', 'enrolled_at']);

        return $this->months($start, $end)->map(fn ($month) => [
            'month' => $month->format('Y-m'),
            'total' => $enrollments
                ->filter(fn (Enrollment $enrollment) => $enrollment->enrolled_at->lte($month->endOfMonth()))
                ->pluck('student_id')
                ->unique()
                ->count(),
        ])->all();
    }

    private function teacherPerformance(int $tenantId, CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return Teacher::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with([
                'user',
                'classes' => fn ($query) => $query->where('tenant_id', $tenantId),
                'classes.enrollments' => fn ($query) => $query->where('tenant_id', $tenantId)->where('status', 'active'),
                'classes.sessions' => fn ($query) => $query->where('tenant_id', $tenantId),
                'classes.sessions.attendances' => fn ($query) => $query->where('tenant_id', $tenantId)->whereBetween('attended_on', [$start->toDateString(), $end->toDateString()]),
                'classes.payments' => fn ($query) => $query->where('tenant_id', $tenantId)->where('status', 'paid')->whereBetween('period_month', [$start, $end]),
            ])
            ->get()
            ->map(function (Teacher $teacher) {
                $classes = $teacher->classes;

                return [
                    'name' => $teacher->user?->name ?? 'Professeur',
                    'classes' => $classes->count(),
                    'students' => $classes->flatMap->enrollments->pluck('student_id')->unique()->count(),
                    'attendanceRate' => $this->attendanceRate($classes->flatMap->sessions->flatMap->attendances),
                    'collectedRevenue' => (float) $classes->flatMap->payments->sum('amount'),
                ];
            })
            ->sortByDesc('attendanceRate')
            ->values();
    }

    private function months(CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return collect(CarbonPeriod::create($start->startOfMonth(), '1 month', $end->startOfMonth()));
    }

    private function paginationMeta(int $total, int $page, int $perPage): array
    {
        $lastPage = max(1, (int) ceil($total / $perPage));
        $currentPage = min($page, $lastPage);
        $from = $total === 0 ? null : (($currentPage - 1) * $perPage) + 1;
        $to = $total === 0 ? null : min($from + $perPage - 1, $total);

        return [
            'current_page' => $currentPage,
            'per_page' => $perPage,
            'total' => $total,
            'last_page' => $lastPage,
            'from' => $from,
            'to' => $to,
        ];
    }
}
