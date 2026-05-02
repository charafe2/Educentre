import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { TenantService } from '../services/tenant.service';

@Injectable({
  providedIn: 'root'
})
export class TenantGuard implements CanActivate {
  constructor(
    private tenantService: TenantService,
    private router: Router
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    const url = state.url;

    // Skip tenant validation for auth routes and root
    if (url.startsWith('/auth') || url === '/') {
      return of(true);
    }

    // Extract tenant from URL (first non-empty segment)
    const urlSegments = url.split('/').filter(s => s.length > 0);
    const tenantSubdomain = urlSegments[0];

    if (!tenantSubdomain) {
      this.router.navigate(['/']);
      return of(false);
    }

    // Validate tenant via service (service handles API/backend validation)
    this.tenantService.validateAndSetTenant(tenantSubdomain);

    if (!this.tenantService.isValid) {
      this.router.navigate(['/invalid-tenant']);
      return of(false);
    }

    return of(true);
  }
}
