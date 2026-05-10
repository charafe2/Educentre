import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private tenantService: TenantService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    _state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          // Already authenticated: redirect to tenant dashboard
          const tenant = this.tenantService.currentTenant?.subdomain || user.tenantId;
          if (tenant) {
            this.router.navigate([`/${tenant}/dashboard`]);
          } else {
            this.router.navigate(['/']);
          }
          return false;
        }

        return true;
      })
    );
  }
}
