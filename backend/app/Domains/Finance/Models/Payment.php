<?php

namespace App\Domains\Finance\Models;

use App\Domains\Planning\Models\CourseClass;
use App\Domains\Students\Models\Student;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

use App\Domains\Core\Traits\Auditable;
use App\Domains\Core\Traits\BelongsToTenant;

class Payment extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes, Auditable;

    protected static string $auditModule = 'Paiements';

    protected static function booted(): void
    {
        static::creating(function (self $payment) {
            if (empty($payment->uuid)) {
                $payment->uuid = (string) Str::uuid();
            }
        });
    }

    protected $fillable = [
        'tenant_id',
        'student_id',
        'class_id',
        'uuid',
        'period_month',
        'amount',
        'amount_paid',
        'status',
        'method',
        'paid_at',
        'note',
        'invoice_generated',
    ];

    protected function casts(): array
    {
        return [
            'period_month' => 'date',
            'amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'paid_at' => 'date',
            'invoice_generated' => 'boolean',
        ];
    }

    

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }

    public function auditLabel(): string
    {
        $student = $this->student;
        $studentName = $student ? "{$student->first_name} {$student->last_name}" : 'Élève supprimé';

        return "Paiement de {$studentName} — {$this->amount} MAD";
    }
}
