<?php

namespace App\Domains\Core\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * SECURITY NOTE: this fails OPEN, not closed — if the `tenant_id`
     * container binding (set by ResolveTenantMiddleware) is absent, no
     * filter is applied at all and the query returns every tenant's rows.
     * That's fine for the one legitimate case where it's absent by design
     * (SuperAdmin-guarded requests, which are intentionally cross-tenant),
     * but it means any future code path that queries a BelongsToTenant
     * model outside an authenticated HTTP request (a console command, a
     * queued job, a listener) MUST pass an explicit tenant_id filter of its
     * own — it cannot rely on this scope to protect it. Prefer explicit
     * `->where('tenant_id', ...)` filters at the service layer over relying
     * solely on this scope; see the codebase's TeacherService/GroupService
     * for the pattern every other service already follows.
     */
    public function apply(Builder $builder, Model $model)
    {
        if (app()->has('tenant_id') && app('tenant_id')) {
            $builder->where($model->getTable() . '.tenant_id', app('tenant_id'));
        }
    }
}
