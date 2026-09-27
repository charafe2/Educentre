import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { CentreStore, sameName } from '../../shared/centre.store';
import {
  ACCENTS, ANNUAL_MONTHS, CENTRE_TYPES, CentreInfo, CentreSettingsStore, Cycle, InvoiceSettings,
  InvoiceTemplate, PLANS, Plan, planOf, priceFor,
} from '../../shared/centre-settings.store';
import { InvoicePreviewComponent, SAMPLE_INVOICE } from '../../shared/invoice-preview.component';
import { OnboardingChecklistComponent } from '../../shared/onboarding/onboarding-checklist.component';
import { OnboardingService } from '../../shared/onboarding/onboarding.service';

/**
 * Paramètres — the centre (identity, contact, legal ids), its receipts
 * (customised with a live preview), its Moujtahid subscription, and what it
 * teaches (levels and subjects, where the onboarding starts).
 * The tab lives in the URL (?onglet=) so a link can open the right one.
 */

type Tab = 'centre' | 'facture' | 'abonnement' | 'enseignement';
type Kind = 'level' | 'subject';

const TABS: Tab[] = ['centre', 'facture', 'abonnement', 'enseignement'];

const LEVEL_SUGGESTIONS = [
  'Primaire', '1re année collège', '2e année collège', '3e année collège',
  'Tronc commun', '1re Bac', '2e Bac', 'Classes prépa', 'Adultes',
];

const SUBJECT_SUGGESTIONS = [
  'Mathématiques', 'Physique-Chimie', 'SVT', 'Français', 'Anglais', 'Arabe',
  'Philosophie', 'Informatique', 'Espagnol', 'Allemand', 'Comptabilité',
];

const MAX_LOGO_BYTES = 1024 * 1024;

@Component({
  selector: 'app-parametres-v2',
  imports: [FormsModule, RouterLink, AppBarComponent, OnboardingChecklistComponent, InvoicePreviewComponent],
  templateUrl: './parametres-v2.component.html',
  styleUrl: './parametres-v2.component.css',
})
export class ParametresV2Component {
  readonly centre = inject(CentreStore);
  readonly settings = inject(CentreSettingsStore);
  private onboarding = inject(OnboardingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  readonly centreTypes = CENTRE_TYPES;
  readonly accents = ACCENTS;
  readonly plans = PLANS;
  readonly annualMonths = ANNUAL_MONTHS;
  readonly priceFor = priceFor;

  // ── Tabs (in the URL) ─────────────────────────────────────────────
  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'centre', label: 'Centre' },
    { key: 'facture', label: 'Facture' },
    { key: 'abonnement', label: 'Abonnement' },
    { key: 'enseignement', label: 'Niveaux et matières' },
  ];

  /** A centre still being set up lands where the onboarding happens. */
  readonly tab = signal<Tab>(
    TABS.find(t => t === this.route.snapshot.queryParamMap.get('onglet'))
      ?? (this.onboarding.active() ? 'enseignement' : 'centre'),
  );

  constructor() {
    effect(() => {
      const onglet = this.tab();
      this.location.replaceState(this.router.createUrlTree([], { relativeTo: this.route, queryParams: { onglet } }).toString());
      this.onboarding.refresh();
    });
  }

  // ── Centre ────────────────────────────────────────────────────────
  centreDraft: CentreInfo = { ...this.settings.centre() };
  /** Bumped on every edit: drafts are plain objects for ngModel. */
  readonly centreTick = signal(0);

  readonly centreDirty = computed(() => {
    this.centreTick();
    return JSON.stringify(this.centreDraft) !== JSON.stringify(this.settings.centre());
  });

  readonly centreErrors = computed(() => {
    this.centreTick();
    const c = this.centreDraft;
    const errors: Partial<Record<keyof CentreInfo, string>> = {};
    if (!c.name.trim()) errors.name = 'Le nom du centre est obligatoire.';
    if (!c.phone.trim()) errors.phone = 'Un téléphone est obligatoire : il figure sur chaque reçu.';
    if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errors.email = 'Adresse email invalide.';
    if (c.ice.trim() && !/^\d{15}$/.test(c.ice.replace(/\s/g, ''))) errors.ice = 'L’ICE compte exactement 15 chiffres.';
    return errors;
  });

  readonly centreErrorCount = computed(() => Object.keys(this.centreErrors()).length);
  readonly centreSubmitted = signal(false);

  touchCentre(): void {
    this.centreTick.update(n => n + 1);
  }

  saveCentre(): void {
    this.centreSubmitted.set(true);
    if (this.centreErrorCount()) return;
    const c = this.centreDraft;
    this.settings.saveCentre({ ...c, name: c.name.trim(), ice: c.ice.replace(/\s/g, '') });
    this.centreDraft = { ...this.settings.centre() };
    this.centreSubmitted.set(false);
    this.touchCentre();
    this.notify('Informations du centre enregistrées');
  }

  discardCentre(): void {
    this.centreDraft = { ...this.settings.centre() };
    this.centreSubmitted.set(false);
    this.touchCentre();
  }

  onLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) {
      this.notify('Choisissez une image PNG, JPG, SVG ou WebP');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.notify('Le logo dépasse 1 Mo : choisissez une image plus légère');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.centreDraft.logo = String(reader.result ?? '');
      this.touchCentre();
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.centreDraft.logo = '';
    this.touchCentre();
  }

  // ── Facture ───────────────────────────────────────────────────────
  invoiceDraft: InvoiceSettings = { ...this.settings.invoice() };
  readonly invoiceTick = signal(0);

  /** What the preview draws: saved centre + invoice draft, updated on every keystroke. */
  readonly preview = computed(() => {
    this.invoiceTick();
    this.centreTick();
    return {
      // The centre draft too, so a logo or name typed in the Centre tab shows at once.
      centre: { ...this.centreDraft },
      settings: { ...this.invoiceDraft },
      data: { ...SAMPLE_INVOICE, number: this.settings.numberFor(this.invoiceDraft) },
    };
  });

  readonly invoiceDirty = computed(() => {
    this.invoiceTick();
    return JSON.stringify(this.invoiceDraft) !== JSON.stringify(this.settings.invoice());
  });

  readonly templates: { key: InvoiceTemplate; label: string }[] = [
    { key: 'classique', label: 'Classique' },
    { key: 'bandeau', label: 'Bandeau' },
    { key: 'minimal', label: 'Minimal' },
  ];

  readonly toggles: { key: keyof InvoiceSettings; label: string }[] = [
    { key: 'showLogo', label: 'Logo du centre' },
    { key: 'showLegal', label: 'Mentions légales (ICE, IF, RC)' },
    { key: 'showStudentCode', label: 'Code de l’élève' },
    { key: 'showGroup', label: 'Groupe et enseignant' },
    { key: 'showMethod', label: 'Mode de paiement' },
    { key: 'showPaidStamp', label: 'Tampon « Payé »' },
    { key: 'showSignature', label: 'Cachet et signature' },
  ];

  readonly missingLegal = computed(() => {
    this.invoiceTick();
    this.centreTick();
    return this.invoiceDraft.showLegal && !this.centreDraft.ice.trim();
  });

  touchInvoice(): void {
    this.invoiceTick.update(n => n + 1);
  }

  setInvoice<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]): void {
    this.invoiceDraft = { ...this.invoiceDraft, [key]: value };
    this.touchInvoice();
  }

  toggle(key: keyof InvoiceSettings): void {
    this.setInvoice(key, !this.invoiceDraft[key] as never);
  }

  isOn(key: keyof InvoiceSettings): boolean {
    return !!this.invoiceDraft[key];
  }

  saveInvoice(): void {
    const d = this.invoiceDraft;
    this.settings.saveInvoice({
      ...d,
      title: d.title.trim() || 'Reçu de paiement',
      prefix: d.prefix.trim(),
      nextNumber: Math.max(1, Math.floor(+d.nextNumber || 1)),
    });
    this.invoiceDraft = { ...this.settings.invoice() };
    this.touchInvoice();
    this.notify('Modèle de reçu enregistré : les prochains reçus l’utiliseront');
  }

  discardInvoice(): void {
    this.invoiceDraft = { ...this.settings.invoice() };
    this.touchInvoice();
  }

  resetInvoice(): void {
    const before = { ...this.invoiceDraft };
    this.invoiceDraft = this.settings.defaults().invoice;
    this.touchInvoice();
    this.notify('Réglages par défaut appliqués à l’aperçu', () => {
      this.invoiceDraft = before;
      this.touchInvoice();
    });
  }

  printSample(): void {
    window.print();
  }

  // ── Abonnement ────────────────────────────────────────────────────
  readonly currentPlan = computed(() => planOf(this.settings.plan()));
  /** Cycle shown in the plan picker; applied only on confirmation. */
  readonly pickCycle = signal<Cycle>(this.settings.cycle());

  readonly meters = computed(() => {
    const p = this.currentPlan();
    const u = this.settings.usage;
    return [
      { label: 'Élèves', used: u.students, max: p.limits.students },
      { label: 'Enseignants', used: u.teachers, max: p.limits.teachers },
      { label: 'Utilisateurs', used: u.users, max: p.limits.users },
    ].map(m => ({ ...m, pct: m.max ? Math.min(100, Math.round((m.used / m.max) * 100)) : 0 }));
  });

  /** Plan change awaiting confirmation. */
  readonly changing = signal<Plan | null>(null);
  readonly confirmingCancel = signal(false);

  planRank(p: Plan): number {
    return PLANS.indexOf(p);
  }

  isCurrent(p: Plan): boolean {
    return p.key === this.settings.plan() && this.pickCycle() === this.settings.cycle();
  }

  /** A smaller plan must still fit today's usage. */
  blockers(p: Plan): string[] {
    const u = this.settings.usage;
    const out: string[] = [];
    if (p.limits.students !== null && u.students > p.limits.students) out.push(`${u.students} élèves pour ${p.limits.students} autorisés`);
    if (p.limits.teachers !== null && u.teachers > p.limits.teachers) out.push(`${u.teachers} enseignants pour ${p.limits.teachers} autorisés`);
    if (u.users > p.limits.users) out.push(`${u.users} utilisateurs pour ${p.limits.users} autorisés`);
    return out;
  }

  askChange(p: Plan): void {
    this.changing.set(p);
  }

  confirmChange(): void {
    const p = this.changing();
    if (!p || this.blockers(p).length) return;
    const before = { plan: this.settings.plan(), cycle: this.settings.cycle() };
    this.settings.changePlan(p.key, this.pickCycle());
    this.changing.set(null);
    this.notify(`Formule ${p.name} ${this.pickCycle() === 'annuel' ? 'annuelle' : 'mensuelle'} activée`, () => {
      this.settings.changePlan(before.plan, before.cycle);
      this.pickCycle.set(before.cycle);
    });
  }

  isUpgrade(p: Plan): boolean {
    return this.planRank(p) > this.planRank(this.currentPlan());
  }

  confirmCancel(): void {
    this.settings.setCancelled(true);
    this.confirmingCancel.set(false);
    this.notify(`Abonnement résilié : Moujtahid reste actif jusqu’au ${this.longDate(this.settings.renewsOn())}`);
  }

  reactivate(): void {
    this.settings.setCancelled(false);
    this.notify('Abonnement réactivé');
  }

  downloadInvoice(number: string): void {
    // Static preview: the real PDF comes from the billing API.
    this.notify(`Facture ${number} téléchargée`);
  }

  // ── Niveaux et matières ───────────────────────────────────────────
  readonly newLevel = signal('');
  readonly newSubject = signal('');

  readonly levelSuggestions = computed(() => LEVEL_SUGGESTIONS.filter(s => !this.centre.levels().some(l => sameName(l, s))));
  readonly subjectSuggestions = computed(() => SUBJECT_SUGGESTIONS.filter(s => !this.centre.subjects().some(l => sameName(l, s))));

  /** Ready for a first group, but none yet: the tab's own call to action. */
  readonly readyForGroup = computed(() =>
    this.centre.isNew() && this.centre.levels().length > 0 && this.centre.subjects().length > 0,
  );

  readonly fresh = signal<string | null>(null);

  add(kind: Kind, value?: string): void {
    const input = kind === 'level' ? this.newLevel : this.newSubject;
    const name = (value ?? input()).trim();
    if (!name) return;
    const added = kind === 'level' ? this.centre.addLevel(name) : this.centre.addSubject(name);
    if (!added) {
      this.notify(`« ${name} » est déjà dans la liste`);
      return;
    }
    if (value === undefined) input.set('');
    this.fresh.set(`${kind}:${name.replace(/\s+/g, ' ')}`);
    setTimeout(() => this.fresh.set(null), 1400);
  }

  remove(kind: Kind, name: string): void {
    if (this.centre.usage(kind, name)) return;
    const index = kind === 'level' ? this.centre.removeLevel(name) : this.centre.removeSubject(name);
    this.notify(`« ${name} » retiré`, () =>
      kind === 'level' ? this.centre.restoreLevel(name, index) : this.centre.restoreSubject(name, index),
    );
  }

  usage(kind: Kind, name: string): number {
    return this.centre.usage(kind, name);
  }

  removeTip(kind: Kind, name: string): string {
    const n = this.usage(kind, name);
    return n ? `Utilisé par ${n} ${n > 1 ? 'groupes' : 'groupe'}` : 'Retirer';
  }

  // ── Helpers ───────────────────────────────────────────────────────
  money(n: number): string {
    return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }

  longDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // ── Snackbar ──────────────────────────────────────────────────────
  readonly snack = signal<{ text: string; undo?: () => void; id: number } | null>(null);
  private snackTimer?: ReturnType<typeof setTimeout>;

  private notify(text: string, undo?: () => void): void {
    clearTimeout(this.snackTimer);
    this.snack.set({ text, undo, id: Date.now() });
    this.snackTimer = setTimeout(() => this.snack.set(null), undo ? 6000 : 3200);
  }

  runUndo(): void {
    this.snack()?.undo?.();
    this.snack.set(null);
  }

  // ── Keyboard ──────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.changing.set(null);
      this.confirmingCancel.set(false);
      return;
    }
    // Ctrl/Cmd + S saves the tab being edited.
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      if (this.tab() === 'centre' && this.centreDirty()) {
        event.preventDefault();
        this.saveCentre();
      } else if (this.tab() === 'facture' && this.invoiceDirty()) {
        event.preventDefault();
        this.saveInvoice();
      }
    }
  }

  /** Unsaved edits: let the browser warn before a reload or tab close. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.centreDirty() || this.invoiceDirty()) event.preventDefault();
  }
}
