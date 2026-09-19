import { inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState, withHooks } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { computed } from '@angular/core';
import { catchError, exhaustMap, of, pipe, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SuperAdminUser {
  id: number;
  name: string;
  email: string;
  role: 'superadmin';
}

interface SuperAdminAuthState {
  user: SuperAdminUser | null;
  loading: boolean;
  initialized: boolean;
}

const initialState: SuperAdminAuthState = {
  user: null,
  loading: false,
  initialized: false,
};

export const SuperadminAuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isLoggedIn: computed(() => store.user() !== null),
    name: computed(() => store.user()?.name ?? 'Super Administrateur'),
  })),
  withMethods((store, http = inject(HttpClient)) => {
    
    const setAuthenticated = (user: SuperAdminUser, token: string) => {
      localStorage.setItem('superadmin_token', token);
      patchState(store, { user, loading: false, initialized: true });
    };

    const clearSession = () => {
      localStorage.removeItem('superadmin_token');
      patchState(store, { user: null, loading: false, initialized: true });
    };

    return {
      async login(email: string, password: string): Promise<boolean> {
        try {
          patchState(store, { loading: true });
          const result = await http.post<{ success: boolean; data: { user: SuperAdminUser; token: string } }>(
            `${environment.apiUrl}/v1/superadmin/auth/login`,
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
        const token = localStorage.getItem('superadmin_token');
        if (token) {
          try {
            await http.post(`${environment.apiUrl}/v1/superadmin/auth/logout`, {}).toPromise();
          } catch {}
        }
        clearSession();
      },

      tryLoadUser: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          exhaustMap(() => {
            const token = localStorage.getItem('superadmin_token');
            if (!token) {
              clearSession();
              return of(null);
            }
            return http.get<{ success: boolean; data: SuperAdminUser }>(`${environment.apiUrl}/v1/superadmin/auth/me`).pipe(
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
    };
  }),
  withHooks({
    onInit(store) {
      store.tryLoadUser();
    }
  })
);
