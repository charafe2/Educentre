<?php

namespace App\Domains\SuperAdmin\Controllers;

use App\Domains\Core\Models\AuditLog;
use App\Domains\Core\Models\Centre;
use App\Domains\SuperAdmin\Resources\AuditLogResource;
use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()->with(['tenant.centre']);

        if ($request->filled('centreId')) {
            $tenantId = Centre::where('id', $request->integer('centreId'))->value('tenant_id');
            $query->where('tenant_id', $tenantId ?? 0);
        }

        if ($request->filled('module')) {
            $query->where('module', $request->string('module'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->date('to'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('actor_name', 'like', "%{$search}%");
            });
        }

        $logs = $query->latest('created_at')->paginate(
            perPage: min(100, max(1, $request->integer('per_page', 25))),
            page: max(1, $request->integer('page', 1)),
        );

        return $this->success(
            AuditLogResource::collection($logs->items()),
            meta: [
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                    'last_page' => $logs->lastPage(),
                    'from' => $logs->firstItem(),
                    'to' => $logs->lastItem(),
                ],
            ],
        );
    }
}
