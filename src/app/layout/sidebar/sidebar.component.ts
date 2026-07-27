import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthStore, TenantPermissionKey } from '../../auth/auth.store';
import { TranslatePipe } from '../../i18n/translate.pipe';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgClass, TranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  auth = inject(AuthStore);

  collapsed = signal(false);
  user = this.auth.user;
  isOwner = this.auth.isOwner;

  toggle() {
    this.collapsed.update(v => !v);
  }

  /** Whether the current user may see the given sidebar tab. */
  canSee(key: TenantPermissionKey): boolean {
    return this.auth.canAccess(key);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    // Hard reload (not router.navigate) so every app-root singleton service
    // (student/teacher/payment caches, etc.) is torn down — an SPA-only nav
    // would let the next login on this tab inherit this tenant's cached data.
    window.location.href = '/login';
  }
}
