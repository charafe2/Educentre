import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SuperadminAuthStore } from '../superadmin/superadmin-auth.store';
import { AuthStore } from './auth.store';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const superadminAuth = inject(SuperadminAuthStore);
  const auth = inject(AuthStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (req.url.includes('/v1/superadmin')) {
          superadminAuth.forceClearSession();
          router.navigate(['/superadmin/login']);
        } else {
          auth.forceClearSession();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
