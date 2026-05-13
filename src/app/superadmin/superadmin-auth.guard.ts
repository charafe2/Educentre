import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SuperadminAuthService } from './superadmin-auth.service';

export const superadminAuthGuard: CanActivateFn = () => {
  const auth = inject(SuperadminAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/superadmin/login']);
};
