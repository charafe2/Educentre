import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ParentAuthService } from '../parent-auth.service';

@Component({
  selector: 'app-parent-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './parent-layout.component.html',
  styleUrl: './parent-layout.component.css'
})
export class ParentLayoutComponent {
  auth = inject(ParentAuthService);
  student = this.auth.currentStudent;

  getInitials(): string {
    const s = this.student();
    if (!s) return '?';
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
