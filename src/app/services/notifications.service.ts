import { Injectable, signal, inject, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, interval, startWith, switchMap } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { environment } from '../../environments/environment';
import { ApiResponse, PaginatedApiResponse, PaginationMeta } from '../models/api-response.model';
import { AuthStore } from '../auth/auth.store';
import { RealtimeService } from './realtime.service';

export interface NotificationFilters {
  page?: number;
  perPage?: number;
  unreadOnly?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private auth = inject(AuthStore);
  private realtime = inject(RealtimeService);

  notifications = signal<AppNotification[]>([]);
  pagination = signal<PaginationMeta>({ current_page: 1, per_page: 15, total: 0, last_page: 1, from: null, to: null });
  unreadCount = signal(0);
  loading = signal(false);

  constructor() {
    // Refresh unread count once when user logs in
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.refreshUnreadCount();

        // Listen for real-time notifications
        if (this.realtime.echo) {
          this.realtime.echo.private(`tenant.${user.tenant_id}`)
            .listen('.notification.created', (event: any) => {
              // We received a real-time notification
              this.unreadCount.update(count => count + 1);
              
              // Only prepend to list if it's meant for this user specifically or a global tenant notification
              if (event.userId === null || event.userId === user.uuid || event.userId === (user as any).id) {
                // If we are currently viewing the first page of notifications, we could prepend it
                // For simplicity, just refetching or prepending
                // In a real app we'd map the event payload to AppNotification
              }
            });
        }
      }
    });
  }

  load(filters: NotificationFilters = {}): void {
    this.loading.set(true);
    this.http.get<PaginatedApiResponse<AppNotification>>(`${environment.apiUrl}/v1/notifications`, {
      params: this.params(filters),
    }).subscribe({
      next: res => {
        if (res.success) {
          this.notifications.set(res.data);
          this.pagination.set(res.meta.pagination);
        }
      },
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  markAsRead(id: number): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(`${environment.apiUrl}/v1/notifications/${id}/read`, {}).pipe(
      tap(() => {
        this.notifications.update(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
        this.refreshUnreadCount();
      }),
    );
  }

  markAllAsRead(): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/v1/notifications/mark-all-read`, {}).pipe(
      tap(() => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      }),
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/notifications/${id}`).pipe(
      tap(() => {
        this.notifications.update(list => list.filter(n => n.id !== id));
        this.refreshUnreadCount();
      }),
    );
  }

  private refreshUnreadCount(): void {
    this.http.get<ApiResponse<{ count: number }>>(`${environment.apiUrl}/v1/notifications/unread-count`)
      .subscribe(res => {
        if (res.success) this.unreadCount.set(res.data.count);
      });
  }

  private params(filters: NotificationFilters): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 1))
      .set('per_page', String(filters.perPage ?? 15));

    if (filters.unreadOnly) params = params.set('unread_only', 'true');

    return params;
  }
}
