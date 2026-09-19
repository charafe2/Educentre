import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SuperadminAuthStore } from '../superadmin-auth.store';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './superadmin-layout.component.html',
  styleUrl: './superadmin-layout.component.css'
})
export class SuperadminLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(SuperadminAuthStore);
  private realtimeService = inject(RealtimeService);

  sidebarCollapsed = signal(false);
  mobileNavOpen = signal(false);

  // Read once at construction: the console is an operations surface, and a
  // dated stamp in the topbar is what tells the operator which day's ledger
  // they are looking at. A ticking clock would be motion without meaning.
  today = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date());

  ngOnInit(): void {
    this.realtimeService.initialize();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    // Hard reload (not router.navigate) so every app-root singleton service
    // is torn down — an SPA-only nav would let the next login on this tab
    // inherit stale cached data.
    window.location.href = '/superadmin/login';
  }
}
