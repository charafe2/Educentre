import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { CountUpDirective } from '../../shared/count-up.directive';

/**
 * Home page of the rebranded tenant app — replaces the sidebar as the way in.
 * Deliberately minimal: four doors into the app and nothing else.
 */

interface Module {
  key: string;
  label: string;
  route: string;
  icon: 'groupes' | 'caisse' | 'enseignants' | 'parametres';
}

interface Stat {
  label: string;
  value: string;
  /** Numeric form of `value`, for the count-up. */
  n: number;
  unit?: string;
  note: string;
  /** 0–100: draws a progress bar under the value. */
  meter?: number;
  tone?: 'late' | 'live';
}

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, AppBarComponent, CountUpDirective],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css',
})
export class AccueilComponent {
  private router = inject(Router);

  readonly modules: Module[] = [
    { key: '1', label: 'Groupes', route: '/accueil/groupes', icon: 'groupes' },
    { key: '2', label: 'Caisse', route: '/accueil/caisse', icon: 'caisse' },
    { key: '3', label: 'Enseignants', route: '/professeurs', icon: 'enseignants' },
    { key: '4', label: 'Paramètres', route: '/parametres', icon: 'parametres' },
  ];

  /** Placeholder figures until the page reads AppBootstrapService. */
  readonly stats: Stat[] = [
    { label: 'Encaissé ce mois', value: '18 450', n: 18450, unit: 'MAD', note: '74 % de l’attendu', meter: 74 },
    { label: 'Impayés', value: '3 870', n: 3870, unit: 'MAD', note: '9 élèves en retard', tone: 'late' },
    { label: 'Séances aujourd’hui', value: '6', n: 6, note: '2 en cours', tone: 'live' },
    { label: 'Présence', value: '92', n: 92, unit: '%', note: 'Cette semaine', meter: 92 },
  ];

  /** 1–4 jumps straight into a module. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

    const module = this.modules.find(m => m.key === event.key);
    if (module) this.router.navigateByUrl(module.route);
  }
}
