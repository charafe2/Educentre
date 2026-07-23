<?php

namespace App\Domains\Notifications\Controllers;

use App\Domains\Notifications\Resources\NotificationResource;
use App\Domains\Notifications\Services\NotificationService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notificationService) {}

    public function index(Request $request): JsonResponse
    {
        $notifications = $this->notificationService->paginate(
            $request->user()->tenant_id,
            $request->user()->id,
            $request->only(['page', 'per_page', 'unread_only']),
        );

        return $this->success(
            NotificationResource::collection($notifications->items()),
            meta: [
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                    'last_page' => $notifications->lastPage(),
                    'from' => $notifications->firstItem(),
                    'to' => $notifications->lastItem(),
                ],
            ]
        );
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = $this->notificationService->unreadCount($request->user()->tenant_id, $request->user()->id);

        return $this->success(['count' => $count]);
    }

    public function markAsRead(int $id, Request $request): JsonResponse
    {
        $this->notificationService->markAsRead($request->user()->tenant_id, $request->user()->id, $id);

        return $this->success(null, 'Notification marquée comme lue.');
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->notificationService->markAllAsRead($request->user()->tenant_id, $request->user()->id);

        return $this->success(null, 'Toutes les notifications ont été marquées comme lues.');
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $this->notificationService->delete($request->user()->tenant_id, $request->user()->id, $id);

        return $this->success(null, 'Notification supprimée.');
    }
}
