import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
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

        return true;
      })
    );
  }
}
