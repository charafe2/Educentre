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

class Payment extends Model
{
    use HasFactory, SoftDeletes;

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
            'paid_at' => 'date',
            'invoice_generated' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function courseClass(): BelongsTo
    {
        return $this->belongsTo(CourseClass::class, 'class_id');
    }
}
