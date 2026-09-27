import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore, CentreOption } from '../../auth.store';

@Component({
  selector: 'app-select-centre',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './select-centre.component.html',
  styleUrl: './select-centre.component.css',
})
export class SelectCentreComponent implements OnInit {
  private auth = inject(AuthStore);
  private router = inject(Router);

  centreSelection = this.auth.centreSelection;
  selecting = signal<string | null>(null);
  error = signal('');

  ngOnInit(): void {
    // The pre-auth token lives only in memory (see AuthStore.login) — a hard
    // refresh mid-picker has nothing to resume, so send them back to log in.
    if (!this.centreSelection()) {
      this.router.navigate(['/login']);
    }
  }

  async choose(centre: CentreOption): Promise<void> {
    this.error.set('');
    this.selecting.set(centre.centreUuid);
    try {
      const ok = await this.auth.selectCentre(centre.centreUuid);
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set("Impossible d'entrer dans ce centre. Réessayez.");
      }
    } finally {
      this.selecting.set(null);
    }
  }

  initials(name: string): string {
    return name.trim().slice(0, 2).toUpperCase();
  }
}
