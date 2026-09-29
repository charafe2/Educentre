import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { CountUpDirective } from '../../shared/count-up.directive';
import { OnboardingChecklistComponent } from '../../shared/onboarding/onboarding-checklist.component';
import { CaisseStore, money } from '../caisse/caisse.store';
import { SessionsService } from '../../services/sessions.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthStore, TenantPermissionKey } from '../../auth/auth.store';

/**
 * Home page of the rebranded tenant app — replaces the sidebar as the way in.
 * Deliberately minimal: four doors into the app and nothing else.
 */

interface Module {
  key: string;
  label: string;
  route: string;
  icon: 'groupes' | 'caisse' | 'enseignants' | 'parametres' | 'ajouter-eleve' | 'liste-eleves';
  /** 'parametres' is owner-only, not a grantable TenantPermissionKey. */
  perm: TenantPermissionKey | 'parametres';
}

/** One-key jumps into the day's most frequent jobs. */
interface QuickAction {
  key: string;
  label: string;
  hint: string;
  route: string;
  query?: Record<string, string>;
  icon: 'encaisser' | 'groupe' | 'enseignant' | 'relance' | 'depense';
  tone?: 'late';
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
  imports: [RouterLink, AppBarComponent, CountUpDirective, OnboardingChecklistComponent],
  providers: [CaisseStore],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.css',
})
export class AccueilComponent {
  private router = inject(Router);
  private caisseStore = inject(CaisseStore);
  private sessionsService = inject(SessionsService);
  private analyticsService = inject(AnalyticsService);
  private auth = inject(AuthStore);

  /** First name of the signed-in user, for the greeting. */
  readonly firstName = computed(() => this.auth.user()?.name?.trim().split(/\s+/)[0] ?? '');

  private readonly allModules: Module[] = [
    { key: '1', label: 'Ajouter un élève', route: '/etudiants/nouveau', icon: 'ajouter-eleve', perm: 'etudiants' },
    { key: '2', label: 'Liste des élèves', route: '/etudiants', icon: 'liste-eleves', perm: 'etudiants' },
    { key: '3', label: 'Groupes', route: '/groupes', icon: 'groupes', perm: 'groupes' },
    { key: '4', label: 'Caisse', route: '/caisse', icon: 'caisse', perm: 'finances' },
    { key: '5', label: 'Enseignants', route: '/enseignants', icon: 'enseignants', perm: 'professeurs' },
    { key: '6', label: 'Paramètres', route: '/parametres', icon: 'parametres', perm: 'parametres' },
  ];

  /** Only the doors this account can actually open — same gate as the route guard. */
  readonly modules = computed(() => this.allModules.filter(m => this.canOpen(m.perm)));

  private canOpen(perm: TenantPermissionKey | 'parametres'): boolean {
    return perm === 'parametres' ? this.auth.isOwner() : this.auth.canAccess(perm);
  }

  /** Real: everyone still owed money, oldest-overdue-first — same source as Caisse's own Impayés tab. */
  private readonly unpaid = this.caisseStore.unpaid;
  private readonly lateCount = computed(() => this.unpaid().length);

  readonly actions = computed<QuickAction[]>(() => {
    const late = this.lateCount();
    const list: Array<QuickAction & { show: boolean }> = [
      { key: 'E', label: 'Encaisser', hint: 'Chercher un élève', route: '/caisse', query: { chercher: '1' }, icon: 'encaisser', show: this.auth.canSeeCaisseTab('encaisser') },
      { key: 'G', label: 'Nouveau groupe', hint: 'Matière et horaire', route: '/groupes', query: { creer: '1' }, icon: 'groupe', show: this.auth.canAccess('groupes') },
      { key: 'P', label: 'Nouvel enseignant', hint: 'Fiche et salaire', route: '/enseignants', query: { nouveau: '1' }, icon: 'enseignant', show: this.auth.canAccess('professeurs') },
      { key: 'R', label: 'Relancer les impayés', hint: late ? `${late} ${late > 1 ? 'élèves' : 'élève'} en retard` : 'Aucun retard', route: '/caisse', query: { onglet: 'impayes' }, icon: 'relance', tone: 'late', show: this.auth.canSeeCaisseTab('impayes') },
      { key: 'D', label: 'Ajouter une dépense', hint: 'Loyer, fournitures…', route: '/caisse', query: { onglet: 'depenses', ajouter: '1' }, icon: 'depense', show: this.auth.canSeeCaisseTab('depenses') },
    ];
    return list.filter(a => a.show);
  });

  /** This week's real attendance rate — the one number here with no other page to share a live signal with, so it's fetched once on load. */
  private readonly attendanceRate = signal<number | null>(null);

  /** Real, whole-hour sessions scheduled today (the model has no Sunday: day 0–5 is Mon–Sat). */
  private readonly todayDay = (new Date().getDay() + 6) % 7;
  private readonly todaysSessions = computed(() => {
    if (this.todayDay > 5) return [];
    return this.sessionsService.sessions().filter(s => s.day === this.todayDay && !s.isCancelled);
  });
  private readonly sessionsInProgress = computed(() => {
    const hour = new Date().getHours();
    return this.todaysSessions().filter(s => s.startHour <= hour && hour < s.endHour).length;
  });

  readonly stats = computed<Stat[]>(() => {
    const month = this.caisseStore.stats().thisMonth;
    const pctExpected = month.expected > 0 ? Math.round((month.collected / month.expected) * 100) : 0;
    const unpaidTotal = this.unpaid().reduce((n, r) => n + r.total, 0);
    const late = this.lateCount();
    const sessionsToday = this.todaysSessions().length;
    const attendance = this.attendanceRate();

    const canSeeFinances = this.auth.canAccess('finances');

    return [
      ...(canSeeFinances ? [{
        label: 'Encaissé ce mois', value: money(month.collected), n: month.collected, unit: 'MAD',
        note: `${pctExpected} % de l’attendu`, meter: Math.min(100, pctExpected),
      }] : []),
      ...(canSeeFinances ? [{
        label: 'Impayés', value: money(unpaidTotal), n: unpaidTotal, unit: 'MAD',
        note: late ? `${late} ${late > 1 ? 'élèves' : 'élève'} en retard` : 'Aucun retard', tone: 'late' as const,
      }] : []),
      {
        label: 'Séances aujourd’hui', value: String(sessionsToday), n: sessionsToday,
        note: `${this.sessionsInProgress()} en cours`, tone: 'live' as const,
      },
      {
        label: 'Présence', value: attendance !== null ? String(attendance) : '—', n: attendance ?? 0, unit: attendance !== null ? '%' : undefined,
        note: 'Cette semaine', meter: attendance ?? undefined,
      },
    ];
  });

  /** 1–4 jumps straight into a module; a letter runs a quick action. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;

    const module = this.modules().find(m => m.key === event.key);
    if (module) {
      this.router.navigateByUrl(module.route);
      return;
    }
    const action = this.actions().find(a => a.key === event.key.toUpperCase());
    if (action) {
      event.preventDefault();
      this.router.navigate([action.route], { queryParams: action.query });
    }
  }

  constructor() {
    this.analyticsService.getWeeklyAttendanceRate().subscribe(res => {
      if (res.success) this.attendanceRate.set(res.data.rate);
    });
  }
}
