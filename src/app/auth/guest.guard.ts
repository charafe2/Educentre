import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthStore } from './auth.store';

/** Keeps an already-authenticated user off the login pages. Waits for the
 *  session rehydration like authGuard, otherwise a hard refresh on /login
 *  would still show the form to a logged-in user. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  return toObservable(auth.initialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => (auth.isLoggedIn() ? router.parseUrl('/accueil') : true)),
  );
};
