import { inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed } from '@angular/core';
import { catchError, exhaustMap, filter, map, of, pipe, tap } from 'rxjs';
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
  is_owner: boolean;
  // Sidebar-tab keys this user may access. Null for owners (unrestricted).
  permissions: string[] | null;
  tenant_id: number;
}

/** Route/permission keys a non-owner user can be granted, mirroring the
 *  sidebar tabs (excludes `dashboard`, always visible, and `parametres`,
 *  owner-only). Kept in sync with the backend's TenantPermissions::KEYS. */
export const TENANT_PERMISSION_KEYS = [
  'revue-mensuelle',
  'etudiants',
  'groupes',
  'professeurs',
  'finances',
  'calendrier',
  'analytiques',
  'documents',
] as const;

export type TenantPermissionKey = typeof TENANT_PERMISSION_KEYS[number];

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  initialized: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isLoggedIn: computed(() => store.user() !== null),
    isOwner: computed(() => store.user()?.is_owner ?? false),
  })),
  withMethods((store, http = inject(HttpClient)) => {
    
    const setAuthenticated = (user: AuthUser, token: string) => {
      localStorage.setItem('auth_token', token);
      patchState(store, { user, loading: false, initialized: true });
    };

    const clearSession = () => {
      localStorage.removeItem('auth_token');
      patchState(store, { user: null, loading: false, initialized: true });
    };

    return {
      async login(email: string, password: string): Promise<boolean> {
        try {
          patchState(store, { loading: true });
          const result = await http.post<{ success: boolean; data: { user: AuthUser; token: string } }>(
            `${environment.apiUrl}/v1/auth/login`,
            { email, password }
          ).toPromise();

          if (result?.success && result.data) {
            setAuthenticated(result.data.user, result.data.token);
            return true;
          }
          patchState(store, { loading: false });
          return false;
        } catch {
          patchState(store, { loading: false });
          return false;
        }
      },

      async logout(): Promise<void> {
        const token = localStorage.getItem('auth_token');
        if (token) {
          try {
            await http.post(`${environment.apiUrl}/v1/auth/logout`, {}).toPromise();
          } catch {}
        }
        clearSession();
      },

      async changePassword(currentPassword: string, newPassword: string, newPasswordConfirmation: string): Promise<string | null> {
        try {
          await http.put(`${environment.apiUrl}/v1/auth/password/change`, {
            current_password: currentPassword,
            new_password: newPassword,
            new_password_confirmation: newPasswordConfirmation,
          }).toPromise();
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
      },

      async checkCurrentPassword(email: string, password: string): Promise<boolean> {
        try {
          const result = await http.post<{ success: boolean }>(`${environment.apiUrl}/v1/auth/verify-password`, {
            email, password
          }).toPromise();
          return result?.success ?? false;
        } catch {
          return false;
        }
      },

      tryLoadUser: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          exhaustMap(() => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
              clearSession();
              return of(null);
            }
            return http.get<{ success: boolean; data: AuthUser }>(`${environment.apiUrl}/v1/auth/me`).pipe(
              tap((res) => {
                if (res.success) {
                  patchState(store, { user: res.data, loading: false, initialized: true });
                } else {
                  clearSession();
                }
              }),
              catchError(() => {
                clearSession();
                return of(null);
              })
            );
          })
        )
      ),

      forceClearSession: () => clearSession(),

      /** Owners can access everything; other users need the key in their
       *  granted permissions list. `dashboard` is always accessible. */
      canAccess(key: TenantPermissionKey | 'dashboard'): boolean {
        const user = store.user();
        if (!user) return false;
        if (key === 'dashboard' || user.is_owner) return true;
        return user.permissions?.includes(key) ?? false;
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.tryLoadUser();
    }
  })
);
