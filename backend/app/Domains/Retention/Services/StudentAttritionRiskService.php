<?php

namespace App\Domains\Retention\Services;

use App\Domains\Students\Models\Student;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class StudentAttritionRiskService
{
    private const LOOKBACK_DAYS = 15;

    private const ABSENCE_THRESHOLD = 80;

    public function rule(): array
    {
        return [
            'lookbackDays' => self::LOOKBACK_DAYS,
            'absenceThreshold' => self::ABSENCE_THRESHOLD,
            'requiredPaymentStatuses' => ['pending', 'overdue'],
            'conditionsOperator' => 'and',
        ];
    }

    public function all(int $tenantId): Collection
    {
        $windowEnd = CarbonImmutable::now();
        $windowStart = $windowEnd->subDays(self::LOOKBACK_DAYS - 1)->startOfDay();
        $currentMonth = $windowEnd->startOfMonth();

        return Student::query()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with([
                'parents',
                'attendances' => fn ($query) => $query
                    ->where('tenant_id', $tenantId)
                    ->whereBetween('attended_on', [$windowStart->toDateString(), $windowEnd->toDateString()]),
                'payments' => fn ($query) => $query
                    ->where('tenant_id', $tenantId)
                    ->whereIn('status', ['pending', 'overdue'])
                    ->where('period_month', '<=', $currentMonth)
                    ->orderBy('period_month'),
            ])
            ->get()
            ->map(fn (Student $student) => $this->riskFor($student, $windowStart, $windowEnd))
            ->filter()
            ->sortByDesc('absenceRate')
            ->values();
    }

    private function riskFor(Student $student, CarbonImmutable $windowStart, CarbonImmutable $windowEnd): ?array
    {
        $attendanceCount = $student->attendances->count();
        if ($attendanceCount === 0 || $student->payments->isEmpty()) {
            return null;
        }

        $absenceCount = $student->attendances->where('status', 'absent')->count();
        $absenceRate = round(($absenceCount / $attendanceCount) * 100, 1);

        if ($absenceRate < self::ABSENCE_THRESHOLD) {
            return null;
        }

        $primaryParent = $student->parents->firstWhere('is_primary', true) ?? $student->parents->first();
        $oldestPayment = $student->payments->first();

        return [
            'studentUuid' => $student->uuid,
            'studentName' => trim($student->first_name.' '.$student->last_name),
            'studentCode' => $student->student_code,
            'parentPhone' => $primaryParent?->phone,
            'absenceRate' => $absenceRate,
            'absenceCount' => $absenceCount,
            'attendanceCount' => $attendanceCount,
            'lookbackDays' => self::LOOKBACK_DAYS,
            'windowStart' => $windowStart->toDateString(),
            'windowEnd' => $windowEnd->toDateString(),
            'paymentIssue' => [
                'status' => $oldestPayment->status,
                'periodMonth' => $oldestPayment->period_month->format('Y-m'),
                'amount' => (float) $oldestPayment->amount,
                'issueCount' => $student->payments->count(),
            ],
            'reasons' => ['absence_threshold_reached', 'payment_missing_or_late'],
        ];
    }
}
