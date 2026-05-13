import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SuperadminAuthService } from '../superadmin-auth.service';

@Component({
  selector: 'app-superadmin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './superadmin-layout.component.html',
  styleUrl: './superadmin-layout.component.css'
})
export class SuperadminLayoutComponent {
  private auth = inject(SuperadminAuthService);
  private router = inject(Router);

  sidebarCollapsed = signal(false);

  logout() {
    this.auth.logout();
    this.router.navigate(['/superadmin/login']);
  }
}
