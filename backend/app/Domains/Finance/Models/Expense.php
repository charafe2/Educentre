<?php

namespace App\Domains\Finance\Models;

use App\Domains\Core\Traits\BelongsToTenant;
use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use BelongsToTenant, HasFactory, HasUuid, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'uuid',
        'category',
        'label',
        'amount',
        'method',
        'expense_date',
        'period_month',
        'is_recurring',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
            'period_month' => 'date',
            'is_recurring' => 'boolean',
        ];
    }
}
