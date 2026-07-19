<?php

namespace App\Domains\Students\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Domains\Core\Traits\BelongsToTenant;

class StudentParent extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $table = 'parents';

    protected $fillable = [
        'tenant_id',
        'student_id',
        'uuid',
        'first_name',
        'last_name',
        'phone',
        'whatsapp_phone',
        'email',
        'relation',
        'is_primary',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
