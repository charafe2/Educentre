<?php

namespace App\Domains\Core\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model)
    {
        if (app()->has('tenant_id') && app('tenant_id')) {
            $builder->where($model->getTable() . '.tenant_id', app('tenant_id'));
        }
    }
}
