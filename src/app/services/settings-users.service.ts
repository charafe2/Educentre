import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { TenantPermissionKey } from '../auth/auth.store';
import { Observable, tap } from 'rxjs';

export interface TenantUser {
  uuid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  is_owner: boolean;
  permissions: TenantPermissionKey[] | null;
  last_login_at: string | null;
  created_at: string;
}

export interface SaveTenantUserPayload {
  name: string;
  email: string;
  permissions: TenantPermissionKey[];
}

export interface UpdateTenantUserPayload {
  name: string;
  permissions: TenantPermissionKey[];
}

@Injectable({ providedIn: 'root' })
export class SettingsUsersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/v1/settings/users`;

  users = signal<TenantUser[]>([]);
  usersCount = signal(0);
  maxUsers = signal(5);
  loading = signal(false);

  /** True once we know the tenant has reached its seat cap. */
  atCapacity(): boolean {
    return this.usersCount() >= this.maxUsers();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<ApiResponse<TenantUser[]> & { meta: { usersCount: number; maxUsers: number } }>(this.baseUrl)
      .subscribe({
        next: res => {
          if (res.success) {
            this.users.set(res.data);
            this.usersCount.set(res.meta.usersCount);
            this.maxUsers.set(res.meta.maxUsers);
          }
        },
        complete: () => this.loading.set(false),
        error: () => this.loading.set(false),
      });
  }

  add(payload: SaveTenantUserPayload): Observable<ApiResponse<TenantUser>> {
    return this.http.post<ApiResponse<TenantUser>>(this.baseUrl, payload).pipe(
      tap(() => this.load()),
    );
  }

  update(uuid: string, payload: UpdateTenantUserPayload): Observable<ApiResponse<TenantUser>> {
    return this.http.put<ApiResponse<TenantUser>>(`${this.baseUrl}/${uuid}`, payload).pipe(
      tap(() => this.load()),
    );
  }

  remove(uuid: string): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${uuid}`).pipe(
      tap(() => this.load()),
    );
  }
}
