import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  const token = localStorage.getItem('auth_token');
  if (token) {
    // Token exists but user not loaded yet — auth service will load it
    return true;
  }

  return router.createUrlTree(['/login']);
};
