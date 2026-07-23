import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

interface SuperAdminUser {
  name: string;
  email: string;
  role: 'superadmin';
}

interface SuperAdminLoginResponse {
  token: string;
  user: SuperAdminUser;
}

const TOKEN_KEY = 'superadmin_token';
const USER_KEY = 'superadmin_user';

@Injectable({ providedIn: 'root' })
export class SuperadminAuthService {
  private http = inject(HttpClient);
  private _loggedIn = signal(Boolean(localStorage.getItem(TOKEN_KEY)));
  private _user = signal<SuperAdminUser | null>(this.readStoredUser());
  private baseUrl = `${environment.apiUrl}/v1/superadmin/auth`;

  isLoggedIn = computed(() => this._loggedIn());
  user = this._user.asReadonly();

  constructor() {
    this.tryLoadUser();
  }

  private tryLoadUser(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    this.http.get<ApiResponse<SuperAdminUser>>(`${this.baseUrl}/me`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this._user.set(res.data);
          }
        },
        error: () => {
          this.clearSession();
        },
      });
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<SuperAdminLoginResponse>>(`${this.baseUrl}/login`, { email, password })
      );

      localStorage.setItem(TOKEN_KEY, response.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
      this._user.set(response.data.user);
      this._loggedIn.set(true);
      return true;
    } catch {
      this.clearSession();
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/logout`, {}));
    } catch {
      // Local cleanup still happens when the backend session is already invalid.
    } finally {
      this.clearSession();
    }
  }

  get name() {
    return this._user()?.name ?? 'Super Administrateur';
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    this._loggedIn.set(false);
  }

  private readStoredUser(): SuperAdminUser | null {
    const value = localStorage.getItem(USER_KEY);
    if (!value) return null;

    try {
      return JSON.parse(value) as SuperAdminUser;
    } catch {
      return null;
    }
  }
}
