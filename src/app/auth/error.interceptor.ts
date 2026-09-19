import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SuperadminAuthStore } from '../superadmin/superadmin-auth.store';
import { AuthStore } from './auth.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  // Resolve the auth stores lazily (only when a 401 actually occurs).
  // Injecting them eagerly at the top of the interceptor breaks the initial
  // load: on a hard refresh the auth store fires its own GET /auth/me from
  // within its onInit hook, that request re-enters this interceptor while the
  // store is still being constructed, and inject(AuthStore) then throws NG0200
  // (circular dependency). The failed request clears the session -> the user
  // gets logged out on every refresh. Deferring the lookup to the 401 handler
  // guarantees the store is fully constructed by the time we read it.
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (req.url.includes('/v1/superadmin')) {
          injector.get(SuperadminAuthStore).forceClearSession();
          router.navigate(['/superadmin/login']);
        } else {
          injector.get(AuthStore).forceClearSession();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
