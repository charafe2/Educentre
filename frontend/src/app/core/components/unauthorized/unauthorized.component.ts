import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TenantService } from '../../services/tenant.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnauthorizedComponent {
  
  constructor(
    private router: Router,
    private tenantService: TenantService
  ) {}

  goToDashboard(): void {
    const tenant = this.tenantService.currentTenant?.subdomain;
    if (tenant) {
      this.router.navigate([`/${tenant}/dashboard`]);
    } else {
      this.router.navigate(['/']);
    }
  }

  logout(): void {
    // Clear auth and tenant context
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.tenantService.clearTenant();
    this.router.navigate(['/auth/login']);
  }
}
