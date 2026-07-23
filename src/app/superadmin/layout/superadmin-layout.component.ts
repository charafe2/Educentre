import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
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
  private router = inject(Router);

  sidebarCollapsed = signal(false);

  logout() {
    this.auth.logout();
    this.router.navigate(['/superadmin/login']);
  }
}
