import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
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
  private router = inject(Router);

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

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
