import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';

export type UserRole = 'SuperAdmin' | 'SchoolAdmin' | 'Teacher' | 'Parent';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const requiredRoles = route.data?.['roles'] as UserRole[];
    const redirectRoute = route.data?.['redirectTo'] as string || 'dashboard';

    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (!user) {
          const tenant = this.tenantService.currentTenant?.subdomain;
          const loginPath = tenant ? `/${tenant}/auth/login` : '/auth/login';
          this.router.navigate([loginPath], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }

        if (requiredRoles && !requiredRoles.includes(user.role)) {
          const tenant = this.tenantService.currentTenant?.subdomain;
          const redirectPath = tenant ? `/${tenant}/${redirectRoute}` : `/${redirectRoute}`;
          this.router.navigate([redirectPath]);
          return false;
        }

        return true;
      })
    );
  }
}
