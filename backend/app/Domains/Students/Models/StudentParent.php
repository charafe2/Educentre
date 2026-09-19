<?php

namespace App\Domains\Students\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

use App\Domains\Core\Traits\BelongsToTenant;

/**
 * Authenticatable in its own right (mirrors App\Models\SuperAdmin) — a
 * parent logs in with their own phone+password and gets their own Sanctum
 * token, separate from the centre's staff `users` table.
 */
class StudentParent extends Authenticatable
{
    use BelongsToTenant, HasApiTokens, HasFactory, SoftDeletes;

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
        'password',
        'relation',
        'is_primary',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'password' => 'hashed',
    ];



    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
