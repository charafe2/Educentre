import { Component, signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  collapsed = signal(false);
  user = this.auth.user;

  toggle() {
    this.collapsed.update(v => !v);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
