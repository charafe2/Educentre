<?php

namespace App\Domains\Core\Models;

use Database\Factories\CentreInvoiceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CentreInvoice extends Model
{
    use HasFactory, SoftDeletes;

    /** Statuses that can be stored. "late" is never stored — see displayStatus(). */
    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_CANCELLED = 'cancelled';

    public const STORED_STATUSES = [self::STATUS_PENDING, self::STATUS_PAID, self::STATUS_CANCELLED];

    /** Derived only: a pending invoice whose due date has passed. */
    public const STATUS_LATE = 'late';

    protected $fillable = [
        'uuid', 'invoice_number', 'centre_id', 'package_plan_id', 'package_name',
        'amount', 'issued_at', 'due_date', 'paid_at', 'status', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'issued_at' => 'date',
        'due_date' => 'date',
        'paid_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $invoice) {
            if (empty($invoice->uuid)) {
                $invoice->uuid = (string) Str::uuid();
            }
        });
    }

    public function centre(): BelongsTo
    {
        return $this->belongsTo(Centre::class);
    }

    public function packagePlan(): BelongsTo
    {
        return $this->belongsTo(PackagePlan::class);
    }

    /** True when this invoice is unpaid and its due date has already passed. */
    public function isLate(): bool
    {
        return $this->status === self::STATUS_PENDING
            && $this->due_date !== null
            && $this->due_date->lt(today());
    }

    /**
     * The status callers see. "late" is computed from the due date rather than
     * stored, so it can never drift out of sync with the calendar.
     */
    public function displayStatus(): string
    {
        return $this->isLate() ? self::STATUS_LATE : $this->status;
    }

    /**
     * Filters on the *display* status, so "late" resolves to the same rows the
     * API reports as late instead of matching a column value that never exists.
     */
    public function scopeWithDisplayStatus(Builder $query, string $status): Builder
    {
        return match ($status) {
            self::STATUS_LATE => $query->where('status', self::STATUS_PENDING)
                ->whereDate('due_date', '<', today()),
            self::STATUS_PENDING => $query->where('status', self::STATUS_PENDING)
                ->whereDate('due_date', '>=', today()),
            default => $query->where('status', $status),
        };
    }

    // Model lives outside App\Models, so Laravel's default factory-name
    // convention (App\ -> Database\Factories\) can't find it. Point at it
    // explicitly.
    protected static function newFactory(): CentreInvoiceFactory
    {
        return CentreInvoiceFactory::new();
    }
}
