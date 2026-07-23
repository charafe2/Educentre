import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, interval, startWith, switchMap } from 'rxjs';
import { AppNotification } from '../models/notification.model';
import { environment } from '../../environments/environment';
import { ApiResponse, PaginatedApiResponse, PaginationMeta } from '../models/api-response.model';
import { AuthService } from '../auth/auth.service';

const UNREAD_POLL_INTERVAL_MS = 30000;

export interface NotificationFilters {
  page?: number;
  perPage?: number;
  unreadOnly?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  notifications = signal<AppNotification[]>([]);
  pagination = signal<PaginationMeta>({ current_page: 1, per_page: 15, total: 0, last_page: 1, from: null, to: null });
  unreadCount = signal(0);
  loading = signal(false);

  constructor() {
    // Only start polling once the user is actually logged in — avoids firing
    // requests on app bootstrap before a token exists.
    interval(UNREAD_POLL_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() => {
        if (!this.auth.isLoggedIn()) {
          return [];
        }
        return this.http.get<ApiResponse<{ count: number }>>(`${environment.apiUrl}/v1/notifications/unread-count`);
      }),
    ).subscribe(res => {
      if (res && 'data' in res && res.success) {
        this.unreadCount.set(res.data.count);
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
