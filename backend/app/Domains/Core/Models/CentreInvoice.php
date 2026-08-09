<?php

namespace App\Domains\Core\Models;

use Database\Factories\CentreInvoiceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CentreInvoice extends Model
{
    use HasFactory, SoftDeletes;

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
        return $this->status === 'pending'
            && $this->due_date !== null
            && $this->due_date->lt(today());
    }

    // Model lives outside App\Models, so Laravel's default factory-name
    // convention (App\ -> Database\Factories\) can't find it. Point at it
    // explicitly.
    protected static function newFactory(): CentreInvoiceFactory
    {
        return CentreInvoiceFactory::new();
    }
}
