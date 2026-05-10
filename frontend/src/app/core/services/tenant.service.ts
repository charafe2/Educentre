import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  settings: {
    timezone: string;
    currency: string;
    language: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TenantService {
  private currentTenantSubject = new BehaviorSubject<Tenant | null>(null);
  private isValidTenantSubject = new BehaviorSubject<boolean>(false);

  public currentTenant$ = this.currentTenantSubject.asObservable();
  public isValidTenant$ = this.isValidTenantSubject.asObservable();

  constructor() {
    this.initializeTenantFromUrl();
  }

  private initializeTenantFromUrl(): void {
    const urlSegments = window.location.pathname.split('/');
    const tenantIndex = urlSegments.findIndex(segment => segment && segment !== '');
    
    if (tenantIndex >= 0 && urlSegments[tenantIndex]) {
      const tenantSubdomain = urlSegments[tenantIndex];
      this.validateAndSetTenant(tenantSubdomain);
    }
  }

  validateAndSetTenant(tenantSubdomain: string): void {
    // In a real app, this would validate against backend
    // For now, we'll accept common demo tenants
    const validTenants = ['minassa', 'demo', 'test'];
    
    if (validTenants.includes(tenantSubdomain.toLowerCase())) {
      const tenant: Tenant = {
        id: tenantSubdomain,
        name: this.getTenantDisplayName(tenantSubdomain),
        subdomain: tenantSubdomain,
        isActive: true,
        settings: {
          timezone: 'UTC',
          currency: 'MAD',
          language: 'en'
        }
      };
      
      this.currentTenantSubject.next(tenant);
      this.isValidTenantSubject.next(true);
    } else {
      this.currentTenantSubject.next(null);
      this.isValidTenantSubject.next(false);
    }
  }

  private getTenantDisplayName(subdomain: string): string {
    const displayNames: { [key: string]: string } = {
      'minassa': 'Minassa Academy',
      'demo': 'Demo School',
      'test': 'Test Center'
    };
    
    return displayNames[subdomain] || subdomain;
  }

  setTenant(tenant: Tenant): void {
    this.currentTenantSubject.next(tenant);
    this.isValidTenantSubject.next(true);
  }

  clearTenant(): void {
    this.currentTenantSubject.next(null);
    this.isValidTenantSubject.next(false);
  }

  get currentTenant(): Tenant | null {
    return this.currentTenantSubject.value;
  }

  get isValid(): boolean {
    return this.isValidTenantSubject.value;
  }

  get tenantId(): string | null {
    return this.currentTenant?.id || null;
  }

  get tenantName(): string {
    return this.currentTenant?.name || 'Unknown';
  }

  // Helper method to get tenant-aware URL
  getTenantUrl(path: string): string {
    const tenant = this.currentTenant?.subdomain;
    if (tenant) {
      return `/${tenant}${path}`;
    }
    return path;
  }

  // Helper method for API headers
  getTenantHeaders(): { [key: string]: string } {
    const tenant = this.currentTenant?.id;
    return tenant ? { 'X-Tenant-ID': tenant } : {};
  }
}
