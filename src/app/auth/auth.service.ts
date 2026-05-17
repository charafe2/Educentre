import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  uuid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar_url: string | null;
  email_verified_at: string | null;
  last_login_at: string | null;
}

interface LoginResponse {
  success: boolean;
  data: {
    user: AuthUser;
    token: string;
  };
  message: string;
  errors: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private _user = signal<AuthUser | null>(null);
  private _loading = signal(false);

  user = this._user.asReadonly();
  isLoggedIn = computed(() => this._user() !== null);
  loading = this._loading.asReadonly();

  constructor() {
    this.tryLoadUser();
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiUrl}/v1/auth/login`, { email, password })
      );

      if (!result.success || !result.data) {
        return false;
      }

      localStorage.setItem('auth_token', result.data.token);
      this._user.set(result.data.user);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiUrl}/v1/auth/logout`, {})
        );
      } catch {
        // Swallow error — clear locally anyway
      }
    }
    localStorage.removeItem('auth_token');
    this._user.set(null);
  }

  async changePassword(currentPassword: string, newPassword: string, newPasswordConfirmation: string): Promise<string | null> {
    try {
      await firstValueFrom(
        this.http.put(`${environment.apiUrl}/v1/auth/password/change`, {
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: newPasswordConfirmation,
        })
      );
      return null;
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse && err.status === 422) {
        const errors = err.error?.errors as Record<string, string[]> | undefined;
        return errors?.['current_password']?.[0]
          ?? errors?.['new_password']?.[0]
          ?? err.error?.message
          ?? 'Erreur de validation.';
      }
      return 'Erreur de connexion au serveur.';
    }
  }

  async checkCurrentPassword(email: string, password: string): Promise<boolean> {
    try {
      const result = await firstValueFrom(
        this.http.post<{ success: boolean }>(`${environment.apiUrl}/v1/auth/verify-password`, {
          email, password
        })
      );
      return result.success;
    } catch {
      return false;
    }
  }

  private tryLoadUser(): void {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    this._loading.set(true);
    this.http.get<{ success: boolean; data: AuthUser }>(`${environment.apiUrl}/v1/auth/me`)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this._user.set(res.data);
          }
          this._loading.set(false);
        },
        error: () => {
          localStorage.removeItem('auth_token');
          this._loading.set(false);
        },
      });
  }
}
