<?php

namespace App\Console\Commands;

use App\Domains\Notifications\Services\NotificationService;
use App\Domains\Retention\Services\StudentAttritionRiskService;
use App\Domains\Students\Models\Student;
use App\Models\Tenant;
use Illuminate\Console\Command;

/**
 * Safety-net sweep: the reactive check (SessionAttendanceService, right
 * after attendance is marked) only catches the "absences" half of the
 * at-risk criteria. The "payment became overdue because time passed" half
 * has no mutation event to hook into at all, so this runs daily across
 * every tenant to catch that case. Register with the scheduler in
 * bootstrap/app.php; still needs `php artisan schedule:run` invoked every
 * minute by cron/supervisor in the deployed environment for this to
 * actually fire — see bootstrap/app.php for the registration.
 */
class CheckStudentsAtRisk extends Command
{
    protected $signature = 'students:check-at-risk';

    protected $description = "Recompute student attrition risk for every tenant and notify staff of newly at-risk students";

    public function handle(StudentAttritionRiskService $riskService, NotificationService $notificationService): int
    {
        $tenantIds = Tenant::query()->pluck('id');

        foreach ($tenantIds as $tenantId) {
            $atRiskStudents = $riskService->all($tenantId);

            foreach ($atRiskStudents as $risk) {
                $student = Student::query()
                    ->where('tenant_id', $tenantId)
                    ->where('uuid', $risk['studentUuid'])
                    ->first();

                if ($student !== null) {
                    $notificationService->notifyStudentAtRisk($student);
                }
            }
        }

        $this->info('Student at-risk sweep complete.');

        return self::SUCCESS;
    }
}
