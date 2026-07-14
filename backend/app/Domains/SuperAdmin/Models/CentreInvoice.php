<?php

namespace App\Domains\SuperAdmin\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CentreInvoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'package_plan_id',
        'uuid',
        'invoice_number',
        'package_name',
        'amount',
        'issued_at',
        'due_date',
        'paid_at',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'issued_at' => 'date',
            'due_date' => 'date',
            'paid_at' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $invoice) {
            if (empty($invoice->uuid)) {
                $invoice->uuid = (string) Str::uuid();
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function packagePlan(): BelongsTo
    {
        return $this->belongsTo(PackagePlan::class);
    }
}
