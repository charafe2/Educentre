import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { SuperadminAuthStore } from './superadmin-auth.store';

export const superadminAuthGuard: CanActivateFn = () => {
  const auth = inject(SuperadminAuthStore);
  const router = inject(Router);

  // Wait for the store to finish rehydrating (tryLoadUser -> GET
  // /superadmin/auth/me) before deciding, so a hard refresh doesn't
  // bounce an authenticated superadmin to the login page.
  return toObservable(auth.initialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => (auth.isLoggedIn() ? true : router.parseUrl('/superadmin/login'))),
  );
};
