import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SuperadminAuthStore } from '../superadmin-auth.store';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './superadmin-layout.component.html',
  styleUrl: './superadmin-layout.component.css'
})
export class SuperadminLayoutComponent {
  private auth = inject(SuperadminAuthStore);

  sidebarCollapsed = signal(false);

  async logout(): Promise<void> {
    await this.auth.logout();
    // Hard reload (not router.navigate) so every app-root singleton service
    // is torn down — an SPA-only nav would let the next login on this tab
    // inherit stale cached data.
    window.location.href = '/superadmin/login';
  }
}
