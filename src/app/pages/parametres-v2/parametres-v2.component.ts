import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { CentreStore, sameName } from '../../shared/centre.store';
import { ACCENTS, CentreSettingsStore, InvoiceSettings, InvoiceTemplate } from '../../shared/centre-settings.store';
import { CentreInfo, CentreService } from '../../services/centre.service';
import { AcademicLevelsService } from '../../services/academic-levels.service';
import { SubjectsService } from '../../services/subjects.service';
import { StudentsService } from '../../services/students.service';
import { TeachersService } from '../../services/teachers.service';
import { AcademicLevel } from '../../models/academic-level.model';
import { Subject } from '../../models/subject.model';
import { InvoicePreviewComponent, SAMPLE_INVOICE } from '../../shared/invoice-preview.component';
import { OnboardingChecklistComponent } from '../../shared/onboarding/onboarding-checklist.component';
import { OnboardingService } from '../../shared/onboarding/onboarding.service';

/**
 * Paramètres — the centre (identity, contact, legal ids), its receipts
 * (customised with a live preview), its Moujtahid subscription (read-only —
 * plan changes/cancellation aren't self-service), and what it teaches
 * (levels and subjects, where the onboarding starts).
 * The tab lives in the URL (?onglet=) so a link can open the right one.
 */

type Tab = 'centre' | 'facture' | 'abonnement' | 'enseignement';
type Kind = 'level' | 'subject';

const TABS: Tab[] = ['centre', 'facture', 'abonnement', 'enseignement'];

const CENTRE_TYPES = ['Soutien scolaire', 'Centre de langues', 'Informatique', 'École privée', 'Artistique', 'Autre'];

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
  readonly centreService = inject(CentreService);
  readonly settings = inject(CentreSettingsStore);
  private academicLevelsService = inject(AcademicLevelsService);
  private subjectsService = inject(SubjectsService);
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private onboarding = inject(OnboardingService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  readonly centreTypes = CENTRE_TYPES;
  readonly accents = ACCENTS;

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
    // The draft starts empty (default CentreInfo) until this resolves —
    // sync it to the real data once, right after the first real load.
    this.centreService.load().then(() => {
      this.centreDraft = { ...this.centreService.centreInfo() };
      this.touchCentre();
    });
    this.centreService.loadSubscription();

    effect(() => {
      const onglet = this.tab();
      this.location.replaceState(this.router.createUrlTree([], { relativeTo: this.route, queryParams: { onglet } }).toString());
      this.onboarding.refresh();
    });
  }

  // ── Centre ────────────────────────────────────────────────────────
  centreDraft: CentreInfo = { ...this.centreService.centreInfo() };
  /** Bumped on every edit: drafts are plain objects for ngModel. */
  readonly centreTick = signal(0);

  readonly centreDirty = computed(() => {
    this.centreTick();
    return JSON.stringify(this.centreDraft) !== JSON.stringify(this.centreService.centreInfo());
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
  readonly centreSaving = signal(false);

  touchCentre(): void {
    this.centreTick.update(n => n + 1);
  }

  saveCentre(): void {
    this.centreSubmitted.set(true);
    if (this.centreErrorCount()) return;
    const c = { ...this.centreDraft, name: this.centreDraft.name.trim(), ice: this.centreDraft.ice.replace(/\s/g, '') };
    this.centreSaving.set(true);
    this.centreService.update(c).then(() => {
      this.centreSaving.set(false);
      this.centreDraft = { ...this.centreService.centreInfo() };
      this.centreSubmitted.set(false);
      this.touchCentre();
      this.notify('Informations du centre enregistrées');
    }).catch(() => {
      this.centreSaving.set(false);
      this.notify('Impossible d’enregistrer : réessayez');
    });
  }

  discardCentre(): void {
    this.centreDraft = { ...this.centreService.centreInfo() };
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

  // ── Facture (unchanged — still localStorage-backed, see CentreSettingsStore) ──
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

  // ── Abonnement (read-only: no self-service plan change/cancel/invoices) ──
  readonly subscription = this.centreService.subscription;
  readonly subscriptionLoading = this.centreService.subscriptionLoading;
  readonly subscriptionError = this.centreService.subscriptionError;

  readonly meters = computed(() => {
    const s = this.subscription();
    const students = this.studentsService.summary().total;
    const teachers = this.teachersService.summary().total;
    const rows = [
      { label: 'Élèves', used: students, max: s?.studentsLimit ?? null },
      { label: 'Enseignants', used: teachers, max: null as number | null },
    ];
    return rows.map(m => ({ ...m, pct: m.max ? Math.min(100, Math.round((m.used / m.max) * 100)) : 0 }));
  });

  statusLabel(status: string): string {
    return ({ active: 'Actif', suspended: 'Suspendu', expired: 'Expiré', cancelled: 'Résilié' } as Record<string, string>)[status] ?? status;
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
    if ((kind === 'level' ? this.centre.levels() : this.centre.subjects()).some(x => sameName(x, name))) {
      this.notify(`« ${name} » est déjà dans la liste`);
      return;
    }
    const request = kind === 'level' ? this.academicLevelsService.add(name) : this.subjectsService.add(name);
    request.subscribe({
      next: () => {
        if (value === undefined) input.set('');
        this.fresh.set(`${kind}:${name.replace(/\s+/g, ' ')}`);
        setTimeout(() => this.fresh.set(null), 1400);
      },
      error: () => this.notify(`Impossible d’ajouter « ${name} »`),
    });
  }

  remove(kind: Kind, item: AcademicLevel | Subject): void {
    if (this.centre.usage(kind, item.name)) return;
    const request = kind === 'level' ? this.academicLevelsService.remove(item.id) : this.subjectsService.remove(item.id);
    request.subscribe({
      next: () => this.notify(`« ${item.name} » retiré`, () => this.add(kind, item.name)),
      error: () => this.notify(`Impossible de retirer « ${item.name} »`),
    });
  }

  levelItems(): AcademicLevel[] {
    return this.academicLevelsService.levels();
  }

  subjectItems(): Subject[] {
    return this.subjectsService.subjects();
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
    return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }

  longDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
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
    if (event.key === 'Escape') return;
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
