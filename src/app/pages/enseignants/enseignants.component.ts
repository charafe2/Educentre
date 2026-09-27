import { Component, ElementRef, HostListener, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import {
  Civility, EnseignantsStore, PayMode, SUBJECTS, Teacher, TeacherGroup,
  formatSlot, fullName, generatePassword, money, salary, shortName, suggestLogin,
} from './enseignants.store';

/**
 * Enseignants — rebranded teachers page: the team, how each one is paid,
 * and their access to the app. Static for now, see EnseignantsStore.
 */

type Filter = 'tous' | 'actifs' | 'inactifs' | 'sans-acces';

interface Draft {
  civility: Civility;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  subjects: string[];
  mode: PayMode;
  fixedSalary: number | null;
  ratePerStudent: number | null;
  active: boolean;
  /** New teacher only: open the access panel right after saving. */
  withAccess: boolean;
}

interface AccessDraft {
  login: string;
  password: string;
}

@Component({
  selector: 'app-enseignants',
  imports: [FormsModule, RouterLink, AppBarComponent],
  providers: [EnseignantsStore],
  templateUrl: './enseignants.component.html',
  styleUrl: './enseignants.component.css',
})
export class EnseignantsComponent {
  readonly store = inject(EnseignantsStore);

  constructor() {
    // Home shortcut "Nouvel enseignant" lands straight on the form; the
    // parameter is dropped so a reload doesn't open it again.
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('nouveau') === '1') {
      const location = inject(Location);
      afterNextRender(() => {
        location.replaceState('/accueil/enseignants');
        this.openCreate();
      });
    }
  }

  readonly money = money;
  readonly salary = salary;
  readonly fullName = fullName;
  readonly shortName = shortName;
  readonly formatSlot = formatSlot;
  readonly subjects = SUBJECTS;
  readonly civilities: Civility[] = ['M.', 'Mme'];

  private search = viewChild<ElementRef<HTMLInputElement>>('search');
  private firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');

  // ── List ──────────────────────────────────────────────────────────
  readonly query = signal('');
  readonly filter = signal<Filter>('tous');

  readonly counts = computed(() => {
    const list = this.store.teachers();
    return {
      tous: list.length,
      actifs: list.filter(t => t.active).length,
      inactifs: list.filter(t => !t.active).length,
      'sans-acces': list.filter(t => !t.access).length,
    } satisfies Record<Filter, number>;
  });

  readonly filters: { key: Filter; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'actifs', label: 'Actifs' },
    { key: 'inactifs', label: 'Inactifs' },
    { key: 'sans-acces', label: 'Sans accès' },
  ];

  readonly rows = computed(() => {
    const q = normalize(this.query().trim());
    const f = this.filter();
    return this.store.teachers()
      .filter(t => f === 'tous' || (f === 'actifs' && t.active) || (f === 'inactifs' && !t.active) || (f === 'sans-acces' && !t.access))
      .filter(t => !q || normalize(`${t.firstName} ${t.lastName} ${t.subjects.join(' ')} ${t.phone.replace(/\s/g, '')} ${t.email} ${t.access?.login ?? ''}`).includes(q))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.lastName.localeCompare(b.lastName, 'fr'));
  });

  readonly withoutAccess = computed(() => this.store.active().filter(t => !t.access).length);

  readonly flashed = signal<number | null>(null);

  modeText(t: Teacher): string {
    return t.mode === 'fixed' ? 'Salaire fixe' : `${t.ratePerStudent} MAD × ${t.students} ${t.students > 1 ? 'élèves' : 'élève'}`;
  }

  initials(t: Teacher): string {
    return (t.firstName.charAt(0) + t.lastName.charAt(0)).toUpperCase();
  }

  // ── Teacher card: who they are and every group they teach ─────────
  readonly viewing = signal<number | null>(null);
  readonly viewingTeacher = computed(() => this.store.byId(this.viewing()));
  readonly viewingGroups = computed(() => {
    const id = this.viewing();
    this.store.groups();
    return id === null ? [] : this.store.groupsOf(id);
  });
  /** Groups under their level heading, in the list's order. */
  readonly viewingByLevel = computed(() => {
    const sections: { level: string; groups: TeacherGroup[] }[] = [];
    for (const g of this.viewingGroups()) {
      const last = sections.at(-1);
      if (last?.level === g.level) last.groups.push(g);
      else sections.push({ level: g.level, groups: [g] });
    }
    return sections;
  });
  readonly viewingTotals = computed(() => {
    const groups = this.viewingGroups();
    const students = groups.reduce((n, g) => n + g.students, 0);
    return {
      students,
      /** What those groups bring in each month if every student pays. */
      revenue: groups.reduce((n, g) => n + g.students * g.price, 0),
      /** Weekly teaching time, in minutes. */
      weekly: groups.reduce((n, g) => n + g.days.length * g.duration, 0),
    };
  });

  openCard(t: Teacher): void {
    this.viewing.set(t.id);
  }

  /** The whole row opens the card, except clicks on its own buttons. */
  onRowClick(event: MouseEvent, t: Teacher): void {
    if ((event.target as HTMLElement).closest('button, a')) return;
    this.openCard(t);
  }

  closeCard(): void {
    this.viewing.set(null);
  }

  /** From the card to another panel: close the card first so only one is open. */
  fromCard(next: 'access' | 'edit'): void {
    const t = this.viewingTeacher();
    this.viewing.set(null);
    if (!t) return;
    if (next === 'access') this.openAccess(t);
    else this.openEdit(t);
  }

  telHref(t: Teacher): string {
    return `tel:${t.phone.replace(/\s/g, '')}`;
  }

  fillPercent(g: TeacherGroup): number {
    return g.capacity ? Math.min(100, Math.round((g.students / g.capacity) * 100)) : 0;
  }

  formatHours(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  }

  // ── Create / edit panel ───────────────────────────────────────────
  readonly editing = signal<'new' | number | null>(null);
  draft: Draft = this.blank();
  /** Bumped on every draft change so computed checks re-run (draft is a plain object for ngModel). */
  readonly draftTick = signal(0);
  readonly submitted = signal(false);

  private blank(): Draft {
    return {
      civility: 'M.', firstName: '', lastName: '', phone: '', email: '', subjects: [],
      mode: 'fixed', fixedSalary: null, ratePerStudent: null, active: true, withAccess: true,
    };
  }

  readonly editingTeacher = computed(() => {
    const e = this.editing();
    return typeof e === 'number' ? this.store.byId(e) : undefined;
  });

  readonly draftErrors = computed(() => {
    this.draftTick();
    const d = this.draft;
    const errors: string[] = [];
    if (!d.firstName.trim() || !d.lastName.trim()) errors.push('Le prénom et le nom sont obligatoires.');
    if (!d.phone.trim()) errors.push('Le téléphone est obligatoire : c’est par là que le centre joint l’enseignant.');
    if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.push('L’adresse email n’est pas valide.');
    if (!d.subjects.length) errors.push('Choisissez au moins une matière.');
    const amount = d.mode === 'fixed' ? d.fixedSalary : d.ratePerStudent;
    if (amount === null || amount === undefined || +amount <= 0) {
      errors.push(d.mode === 'fixed' ? 'Indiquez le salaire mensuel.' : 'Indiquez le montant par élève.');
    }
    return errors;
  });

  /** Live estimate shown under the pay fields. */
  readonly draftEstimate = computed(() => {
    this.draftTick();
    const d = this.draft;
    const students = this.editingTeacher()?.students ?? 0;
    const owed = salary({ mode: d.mode, fixedSalary: +(d.fixedSalary ?? 0), ratePerStudent: +(d.ratePerStudent ?? 0), students });
    return { students, owed };
  });

  touch(): void {
    this.draftTick.update(n => n + 1);
  }

  openCreate(): void {
    this.draft = this.blank();
    this.submitted.set(false);
    this.editing.set('new');
    this.touch();
    setTimeout(() => this.firstField()?.nativeElement.focus(), 60);
  }

  openEdit(t: Teacher): void {
    this.draft = {
      civility: t.civility, firstName: t.firstName, lastName: t.lastName, phone: t.phone, email: t.email,
      subjects: [...t.subjects], mode: t.mode,
      fixedSalary: t.fixedSalary || null, ratePerStudent: t.ratePerStudent || null,
      active: t.active, withAccess: false,
    };
    this.submitted.set(false);
    this.editing.set(t.id);
    this.touch();
    setTimeout(() => this.firstField()?.nativeElement.focus(), 60);
  }

  closeDrawer(): void {
    this.editing.set(null);
  }

  toggleSubject(s: string): void {
    const list = this.draft.subjects;
    this.draft.subjects = list.includes(s) ? list.filter(x => x !== s) : [...list, s];
    this.touch();
  }

  setMode(mode: PayMode): void {
    this.draft.mode = mode;
    this.touch();
  }

  save(): void {
    this.submitted.set(true);
    if (this.draftErrors().length) {
      // The checks render at the foot of a scrolling panel: bring them into view.
      setTimeout(() => document.querySelector('.panel-body .checks')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 30);
      return;
    }

    const d = this.draft;
    const fields = {
      civility: d.civility,
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      phone: formatPhone(d.phone),
      email: d.email.trim(),
      subjects: d.subjects,
      mode: d.mode,
      fixedSalary: d.mode === 'fixed' ? Math.round(+(d.fixedSalary ?? 0)) : 0,
      ratePerStudent: d.mode === 'per_student' ? Math.round(+(d.ratePerStudent ?? 0)) : 0,
      active: d.active,
    };

    const target = this.editing();
    if (target === 'new') {
      const created = this.store.add({ ...fields, students: 0, groups: 0, access: null });
      this.editing.set(null);
      this.flash(created.id);
      if (d.withAccess) {
        this.openAccess(created);
        this.notify(`${fullName(created)} ajouté. Créez maintenant son accès.`);
      } else {
        this.notify(`${fullName(created)} ajouté`, () => this.store.remove(created.id));
      }
    } else if (typeof target === 'number') {
      const before = this.store.byId(target);
      this.store.update(target, fields);
      // A teacher who stops working here can't keep signing in.
      if (before?.access?.state === 'active' && !fields.active) {
        this.store.update(target, { access: { ...before.access, state: 'suspended' } });
      }
      this.editing.set(null);
      this.flash(target);
      this.notify(`Fiche de ${fields.firstName} ${fields.lastName} enregistrée`, before ? () => this.store.update(target, before) : undefined);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  readonly confirming = signal<Teacher | null>(null);

  askDelete(t: Teacher): void {
    this.confirming.set(t);
  }

  confirmDelete(): void {
    const t = this.confirming();
    this.confirming.set(null);
    if (!t) return;
    const removed = this.store.remove(t.id);
    if (removed) this.notify(`${fullName(t)} supprimé`, () => this.store.restore(removed));
  }

  // ── Access panel ──────────────────────────────────────────────────
  readonly accessFor = signal<number | null>(null);
  readonly accessTeacher = computed(() => this.store.byId(this.accessFor()));
  accessDraft: AccessDraft = { login: '', password: '' };
  readonly accessTick = signal(0);
  readonly showPassword = signal(true);
  /**
   * Plain password just created or reset. Kept only while the panel is open:
   * once closed, nobody (not even the owner) can read it again, like the
   * hashed column it stands for.
   */
  readonly revealed = signal<{ login: string; password: string } | null>(null);
  readonly editingLogin = signal(false);
  readonly copied = signal<'login' | 'password' | 'message' | null>(null);

  openAccess(t: Teacher): void {
    this.accessFor.set(t.id);
    this.revealed.set(null);
    this.editingLogin.set(false);
    this.showPassword.set(true);
    this.accessDraft = { login: t.access?.login ?? suggestLogin(t.firstName, t.lastName), password: generatePassword() };
    this.accessTick.update(n => n + 1);
  }

  closeAccess(): void {
    this.accessFor.set(null);
    this.revealed.set(null);
  }

  regenerate(): void {
    this.accessDraft.password = generatePassword();
    this.showPassword.set(true);
    this.accessTick.update(n => n + 1);
  }

  readonly accessErrors = computed(() => {
    this.accessTick();
    const t = this.accessTeacher();
    const { login, password } = this.accessDraft;
    const errors: string[] = [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim())) errors.push('L’identifiant doit être une adresse email valide.');
    else if (this.store.loginTaken(login, t?.id)) errors.push('Cet identifiant est déjà utilisé par un autre compte.');
    if (!t?.access && password.length < 8) errors.push('Le mot de passe doit contenir au moins 8 caractères.');
    return errors;
  });

  onAccessInput(): void {
    this.accessTick.update(n => n + 1);
  }

  createAccess(): void {
    const t = this.accessTeacher();
    if (!t || this.accessErrors().length) return;
    const login = this.accessDraft.login.trim().toLowerCase();
    const password = this.accessDraft.password;
    this.store.update(t.id, { access: { login, state: 'active', passwordSetAt: new Date().toISOString() } });
    this.revealed.set({ login, password });
    this.flash(t.id);
    this.notify(`Accès créé pour ${fullName(t)}`);
  }

  resetPassword(): void {
    const t = this.accessTeacher();
    if (!t?.access) return;
    const password = generatePassword();
    this.store.update(t.id, { access: { ...t.access, state: 'active', passwordSetAt: new Date().toISOString() } });
    this.revealed.set({ login: t.access.login, password });
    this.showPassword.set(true);
    this.notify(`Nouveau mot de passe généré pour ${fullName(t)}. L’ancien ne fonctionne plus.`);
  }

  saveLogin(): void {
    const t = this.accessTeacher();
    if (!t?.access || this.accessErrors().length) return;
    const before = t.access;
    const login = this.accessDraft.login.trim().toLowerCase();
    this.store.update(t.id, { access: { ...before, login } });
    this.editingLogin.set(false);
    if (this.revealed()) this.revealed.set({ ...this.revealed()!, login });
    this.notify(`Identifiant modifié : ${login}`, () => this.store.update(t.id, { access: before }));
  }

  toggleSuspend(): void {
    const t = this.accessTeacher();
    if (!t?.access) return;
    const before = t.access;
    const state = before.state === 'active' ? 'suspended' : 'active';
    this.store.update(t.id, { access: { ...before, state } });
    this.notify(
      state === 'suspended' ? `Accès de ${fullName(t)} suspendu` : `Accès de ${fullName(t)} réactivé`,
      () => this.store.update(t.id, { access: before }),
    );
  }

  revokeAccess(): void {
    const t = this.accessTeacher();
    if (!t?.access) return;
    const before = t.access;
    this.store.update(t.id, { access: null });
    this.revealed.set(null);
    this.accessDraft = { login: before.login, password: generatePassword() };
    this.accessTick.update(n => n + 1);
    this.notify(`Accès de ${fullName(t)} supprimé`, () => this.store.update(t.id, { access: before }));
  }

  /** Ready-to-send message: WhatsApp is how most centres reach teachers. */
  credentialsMessage(): string {
    const t = this.accessTeacher();
    const r = this.revealed();
    if (!t || !r) return '';
    return [
      `Bonjour ${t.firstName},`,
      `Voici vos accès à Moujtahid :`,
      `Identifiant : ${r.login}`,
      `Mot de passe : ${r.password}`,
      `Connexion : ${location.origin}/login`,
      `Pensez à changer votre mot de passe après votre première connexion.`,
    ].join('\n');
  }

  whatsappUrl(): string {
    const t = this.accessTeacher();
    if (!t) return '';
    const digits = t.phone.replace(/\D/g, '');
    const intl = digits.startsWith('0') ? `212${digits.slice(1)}` : digits;
    return `https://wa.me/${intl}?text=${encodeURIComponent(this.credentialsMessage())}`;
  }

  sendByEmail(): void {
    const t = this.accessTeacher();
    if (!t?.email) return;
    // Static preview: the real send goes through the backend mailer.
    this.notify(`Identifiants envoyés à ${t.email}`);
  }

  async copy(what: 'login' | 'password' | 'message'): Promise<void> {
    const r = this.revealed();
    const text = what === 'message' ? this.credentialsMessage() : what === 'login' ? (r?.login ?? this.accessTeacher()?.access?.login ?? '') : (r?.password ?? '');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      setTimeout(() => this.copied.set(null), 1600);
    } catch {
      this.notify('Copie impossible : sélectionnez le texte à la main.');
    }
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return `aujourd’hui à ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
    if (days === 1) return 'hier';
    if (days < 30) return `il y a ${days} jours`;
    return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  // ── Snackbar ──────────────────────────────────────────────────────
  readonly snack = signal<{ text: string; undo?: () => void; id: number } | null>(null);
  private snackTimer?: ReturnType<typeof setTimeout>;

  private notify(text: string, undo?: () => void): void {
    clearTimeout(this.snackTimer);
    this.snack.set({ text, undo, id: Date.now() });
    this.snackTimer = setTimeout(() => this.snack.set(null), undo ? 6000 : 3500);
  }

  runUndo(): void {
    const s = this.snack();
    s?.undo?.();
    this.snack.set(null);
    this.notify('Action annulée');
  }

  private flash(id: number): void {
    this.flashed.set(id);
    setTimeout(() => this.flashed.set(null), 1400);
  }

  // ── Keyboard ──────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.confirming()) this.confirming.set(null);
      else if (this.viewing() !== null) this.closeCard();
      else if (this.accessFor() !== null) this.closeAccess();
      else if (this.editing() !== null) this.closeDrawer();
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    const overlay = this.editing() !== null || this.accessFor() !== null || this.viewing() !== null || !!this.confirming();
    if (typing || overlay || event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === '/') {
      event.preventDefault();
      this.search()?.nativeElement.focus();
    } else if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      this.openCreate();
    }
  }
}

/** Case- and accent-insensitive matching: "francais" finds "Français". */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** "0661998877" → "06 61 99 88 77"; anything else is kept as typed. */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) ? digits.replace(/(\d{2})(?=\d)/g, '$1 ') : value.trim();
}
