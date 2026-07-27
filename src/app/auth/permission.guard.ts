import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthStore, TenantPermissionKey } from './auth.store';

/**
 * Route-level enforcement of "Paramètres > Utilisateurs" permissions — the
 * sidebar hides tabs a user can't access, but a restricted user could still
 * type the URL directly, so this guard is the real gate. Set `data: { permKey }`
 * on each child route under the authenticated layout (see app.routes.ts);
 * routes without a permKey (e.g. dashboard) are always allowed once authGuard
 * has confirmed the session. `parametres` is owner-only regardless of
 * permissions (billing, other users, centre info all live there).
 */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  const permKey = route.data['permKey'] as TenantPermissionKey | 'parametres' | undefined;

  return toObservable(auth.initialized).pipe(
    filter((initialized) => initialized),
    take(1),
    map(() => {
      if (!permKey) return true;
      if (permKey === 'parametres') {
        return auth.isOwner() ? true : router.parseUrl('/dashboard');
      }
      return auth.canAccess(permKey) ? true : router.parseUrl('/dashboard');
    }),
  );
};
