import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SuperadminAuthStore } from './superadmin-auth.store';

export const superadminAuthGuard: CanActivateFn = (route, state) => {
  const auth = inject(SuperadminAuthStore);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  return router.parseUrl('/superadmin/login');
};
