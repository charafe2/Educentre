import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SuperadminAuthStore } from './superadmin-auth.store';

export const superadminGuestGuard: CanActivateFn = () => {
  const auth = inject(SuperadminAuthStore);
  const router = inject(Router);
  
  if (!auth.isLoggedIn()) {
    return true;
  }
  
  return router.createUrlTree(['/superadmin/dashboard']);
};
