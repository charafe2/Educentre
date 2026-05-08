import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ParentAuthService } from './parent-auth.service';

export const parentAuthGuard: CanActivateFn = () => {
  const auth = inject(ParentAuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/parent/login']);
};
