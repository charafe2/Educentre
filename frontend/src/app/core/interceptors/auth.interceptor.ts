import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip auth for login and public endpoints
    if (request.url.includes('/auth/login') || request.url.includes('/public')) {
      return next.handle(request);
    }

    const token = this.authService.currentToken;
    const tenantId = this.authService.tenantId;

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    // Add tenant ID for multi-tenancy
    if (tenantId) {
      request = request.clone({
        setHeaders: {
          'X-Tenant-ID': tenantId
        }
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.snackBar.open('Session expired. Please login again.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.authService.logout();
        } else if (error.status === 403) {
          this.snackBar.open('Access denied. You do not have permission.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        } else if (error.status >= 500) {
          this.snackBar.open('Server error. Please try again later.', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }

        return throwError(() => error);
      })
    );
  }
}
