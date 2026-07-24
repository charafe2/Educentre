import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthStore } from './auth.store';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  // On a hard refresh the store rehydrates the session asynchronously
  // (tryLoadUser -> GET /auth/me). Wait until that has finished before
  // deciding, otherwise the guard fires while user is still null and
  // bounces an authenticated user to /login.
  return toObservable(auth.initialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => (auth.isLoggedIn() ? true : router.parseUrl('/login'))),
  );
};
