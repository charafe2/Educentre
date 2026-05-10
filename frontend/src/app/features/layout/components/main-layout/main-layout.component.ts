import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { Router, RouterOutlet, ActivatedRoute, RouterModule } from '@angular/router';
import { TenantService } from '../../../../core/services/tenant.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    RouterOutlet,
    RouterModule
  ],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements OnInit {
  isHandset = false;
  opened = true;

  constructor(
    public tenantService: TenantService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Initialize tenant context
  }

  getRouteTitle(): string {
    const route = this.route.snapshot;
    const pathSegments = route.pathFromRoot
      .flatMap(segment => segment.url)
      .map(segment => segment.path)
      .filter(path => path && path !== '');
    
    const lastSegment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'dashboard';
    
    switch (lastSegment) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'Students';
      case 'planning': return 'Planning';
      case 'finance': return 'Finance';
      case 'communication': return 'Communication';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  }

  get tenantName(): string {
    return this.tenantService.tenantName;
  }

  get tenantId(): string | null {
    return this.tenantService.tenantId;
  }

  toggleSidebar(): void {
    this.opened = !this.opened;
  }

  navigateTo(route: string): void {
    const tenantUrl = this.tenantService.getTenantUrl(`/${route}`);
    this.router.navigate([tenantUrl]);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.tenantService.clearTenant();
    this.router.navigate(['/auth/login']);
  }

  get navigationItems(): Array<{icon: string, label: string, route: string}> {
    return [
      { icon: 'dashboard', label: 'Dashboard', route: 'dashboard' },
      { icon: 'people', label: 'Students', route: 'students' },
      { icon: 'event', label: 'Planning', route: 'planning' },
      { icon: 'payments', label: 'Finance', route: 'finance' },
      { icon: 'chat', label: 'Communication', route: 'communication' },
      { icon: 'settings', label: 'Settings', route: 'settings' }
    ];
  }
}
