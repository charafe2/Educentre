import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-superadmin-overview',
  imports: [RouterLink],
  template: `
    <div class="overview">
      <h1 class="title">Vue d'ensemble</h1>
      <p class="sub">Bienvenue sur le panneau super administration de Moujtahid.</p>
      <a routerLink="/superadmin/clients" class="goto-clients">
        <i class="fa-solid fa-buildings"></i>
        Gérer les comptes clients
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    </div>
  `,
  styles: [`
    .overview { padding: 1rem 0; }
    .title { font-size: 1.6rem; font-weight: 700; color: #0f172a; letter-spacing: -0.04em; margin: 0 0 0.35rem; }
    .sub { color: #94a3b8; font-size: 0.9rem; margin: 0 0 2rem; }
    .goto-clients {
      display: inline-flex; align-items: center; gap: 0.75rem;
      background: #f0fdfa; border: 1px solid #99f6e4;
      color: #0d9488; border-radius: 12px; padding: 1rem 1.5rem;
      font-size: 0.9rem; font-weight: 600; text-decoration: none;
      transition: background 0.15s, transform 0.15s;
    }
    .goto-clients:hover { background: #ccfbf1; transform: translateY(-1px); }
    .goto-clients i:first-child { font-size: 1.1rem; }
    .goto-clients i:last-child { font-size: 0.75rem; opacity: 0.5; }
  `]
})
export class SuperadminOverviewComponent {}
