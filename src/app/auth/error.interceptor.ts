import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SuperadminAuthService } from '../superadmin/superadmin-auth.service';
import { AuthService } from './auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const superadminAuth = inject(SuperadminAuthService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (req.url.includes('/v1/superadmin')) {
          superadminAuth.logout();
          router.navigate(['/superadmin/login']);
        } else {
          auth.logout();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
