import { Component, ElementRef, HostListener, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { SubjectsService } from '../../services/subjects.service';
import { ToastService } from '../../services/toast.service';
import { Teacher, PaymentMode } from '../../models/teacher.model';
import { Classe } from '../../models/classe.model';
import { Group } from '../../models/group.model';
import { money, fullName, formatDate } from './enseignants.util';

/**
 * Enseignants — the centre's teachers, their pay and their app access.
 * Wired to the real API: TeachersService for the roster, ClassesService +
 * GroupsService to show what each teacher actually teaches. Every real
 * teacher already has an app account from creation (no "no access yet"
 * state exists server-side) — the access panel only resets/suspends/
 * revokes/reactivates an existing account.
 */

type Filter = 'tous' | 'actifs' | 'inactifs' | 'revoques';

interface Draft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  specialty: string;
  mode: PaymentMode;
  fixedSalary: number | null;
  ratePerStudent: number | null;
  percentageRate: number | null;
  active: boolean;
  /** Classes this teacher will own (`Classe.teacherId`) once saved — reassigns them away from whoever teaches them today, if anyone. */
  classIds: number[];
}

interface TeacherRow {
  teacher: Teacher;
  classes: Classe[];
  groups: { classe: Classe; groups: Group[] }[];
  studentCount: number;
  salary: number;
}

@Component({
  selector: 'app-enseignants',
  imports: [FormsModule, AppBarComponent],
  templateUrl: './enseignants.component.html',
  styleUrl: './enseignants.component.css',
})
export class EnseignantsComponent {
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private subjectsService = inject(SubjectsService);
  private toast = inject(ToastService);

  constructor() {
    // Home shortcut "Nouvel enseignant" lands straight on the form; the
    // parameter is dropped so a reload doesn't open it again.
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('nouveau') === '1') {
      const location = inject(Location);
      afterNextRender(() => {
        location.replaceState('/v2/enseignants');
        this.openCreate();
      });
    }
  }

  readonly money = money;
  readonly fullName = fullName;
  readonly formatDate = formatDate;
  readonly subjects = computed(() => this.subjectsService.subjects().map(s => s.name));

  private search = viewChild<ElementRef<HTMLInputElement>>('search');
  private firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');

  // ── List ──────────────────────────────────────────────────────────
  readonly query = signal('');
  readonly filter = signal<Filter>('tous');
  /** Optimistically hidden while a delete's undo window is running — see confirmDelete(). */
  private readonly hiddenIds = signal<Set<number>>(new Set());

  readonly teachers = this.teachersService.teachers;
  readonly classes = this.classesService.classes;

  readonly teacherRows = computed<TeacherRow[]>(() => {
    const allClasses = this.classes();
    return this.teachers().map(teacher => {
      const classes = allClasses.filter(c => teacher.classIds.includes(c.id));
      const groups = classes.map(c => ({
        classe: c,
        groups: this.groupsService.getGroupsForClasse(c.id),
      }));
      const studentCount = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
      const salary = this.teachersService.getPayrollAmount(teacher, classes);
      return { teacher, classes, groups, studentCount, salary };
    });
  });

  readonly active = computed(() => this.teachers().filter(t => t.status === 'active'));
  readonly payroll = computed(() => this.teacherRows()
    .filter(r => r.teacher.status === 'active')
    .reduce((n, r) => n + r.salary, 0));

  readonly counts = computed(() => {
    const list = this.teachers();
    return {
      tous: list.length,
      actifs: list.filter(t => t.status === 'active').length,
      inactifs: list.filter(t => t.status === 'inactive').length,
      revoques: list.filter(t => t.access.state === 'revoked').length,
    } satisfies Record<Filter, number>;
  });

  readonly filters: { key: Filter; label: string }[] = [
    { key: 'tous', label: 'Tous' },
    { key: 'actifs', label: 'Actifs' },
    { key: 'inactifs', label: 'Inactifs' },
    { key: 'revoques', label: 'Accès révoqué' },
  ];

  readonly rows = computed(() => {
    const q = normalize(this.query().trim());
    const f = this.filter();
    const hidden = this.hiddenIds();
    return this.teacherRows()
      .filter(r => !hidden.has(r.teacher.id))
      .filter(r => f === 'tous'
        || (f === 'actifs' && r.teacher.status === 'active')
        || (f === 'inactifs' && r.teacher.status === 'inactive')
        || (f === 'revoques' && r.teacher.access.state === 'revoked'))
      .filter(r => !q || normalize(`${r.teacher.firstName} ${r.teacher.lastName} ${r.teacher.specialty} ${r.teacher.phone} ${r.teacher.email}`).includes(q))
      .sort((a, b) => Number(b.teacher.status === 'active') - Number(a.teacher.status === 'active') || a.teacher.lastName.localeCompare(b.teacher.lastName, 'fr'));
  });

  readonly flashed = signal<number | null>(null);

  modeText(row: TeacherRow): string {
    const t = row.teacher;
    if (t.paymentMode === 'fixed') return 'Salaire fixe';
    if (t.paymentMode === 'percentage') return `${t.percentageRate ?? 0}% du prix des classes`;
    return `${t.ratePerStudent ?? 0} MAD × ${row.studentCount} ${row.studentCount > 1 ? 'élèves' : 'élève'}`;
  }

  initials(t: Teacher): string {
    return (t.firstName.charAt(0) + t.lastName.charAt(0)).toUpperCase();
  }

  // ── Teacher card: who they are and every class/group they teach ────
  readonly viewing = signal<number | null>(null);
  readonly viewingRow = computed(() => this.rows().find(r => r.teacher.id === this.viewing())
    ?? this.teacherRows().find(r => r.teacher.id === this.viewing()));
  readonly viewingByLevel = computed(() => {
    const sections: { level: string; entries: { classe: Classe; group: Group }[] }[] = [];
    const groups = this.viewingRow()?.groups ?? [];
    for (const { classe, groups: classGroups } of groups) {
      for (const group of classGroups) {
        const last = sections.at(-1);
        if (last?.level === classe.level) last.entries.push({ classe, group });
        else sections.push({ level: classe.level, entries: [{ classe, group }] });
      }
    }
    return sections;
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
    const t = this.viewingRow()?.teacher;
    this.viewing.set(null);
    if (!t) return;
    if (next === 'access') this.openAccess(t);
    else this.openEdit(t);
  }

  telHref(t: Teacher): string {
    return `tel:${t.phone.replace(/\s/g, '')}`;
  }

  fillPercent(group: Group, classe: Classe): number {
    return classe.maxCapacity ? Math.min(100, Math.round((group.studentIds.length / classe.maxCapacity) * 100)) : 0;
  }

  // ── Create / edit panel ───────────────────────────────────────────
  readonly editing = signal<'new' | number | null>(null);
  draft: Draft = this.blank();
  /** Bumped on every draft change so computed checks re-run (draft is a plain object for ngModel). */
  readonly draftTick = signal(0);
  readonly submitted = signal(false);
  readonly saving = signal(false);

  private blank(): Draft {
    return {
      firstName: '', lastName: '', phone: '', email: '', specialty: '',
      mode: 'fixed', fixedSalary: null, ratePerStudent: null, percentageRate: null, active: true,
      classIds: [],
    };
  }

  /** Every class, the one(s) matching the chosen specialty first — this teacher's picker doesn't hard-filter by subject since a teacher can cover more than their main one. */
  readonly pickableClasses = computed(() => {
    this.draftTick();
    const specialty = this.draft.specialty;
    return [...this.classes()].sort((a, b) => {
      const aMatch = specialty && a.subject === specialty ? 0 : 1;
      const bMatch = specialty && b.subject === specialty ? 0 : 1;
      return aMatch - bMatch || a.subject.localeCompare(b.subject, 'fr') || a.level.localeCompare(b.level, 'fr');
    });
  });

  isClassPicked(classId: number): boolean {
    return this.draft.classIds.includes(classId);
  }

  toggleDraftClass(classId: number): void {
    this.draft.classIds = this.isClassPicked(classId)
      ? this.draft.classIds.filter(id => id !== classId)
      : [...this.draft.classIds, classId];
    this.touch();
  }

  /**
   * Expands picked classes into one row per real group (falling back to the
   * class itself when it has none yet), each carrying that group's own
   * effective price/roster — a class's own fields aren't enough for the pay
   * estimate below since two of its groups can have different overrides
   * (set from Groupes), and per_student/percentage need to add up what each
   * group is actually billed, not the class's raw, possibly-stale numbers.
   */
  private effectiveRowsFor(classIds: number[]): Classe[] {
    const picked = this.pickableClasses().filter(c => classIds.includes(c.id));
    return picked.flatMap(c => {
      const groups = this.groupsService.getGroupsForClasse(c.id);
      if (!groups.length) return [c];
      return groups.map(g => ({ ...c, monthlyPrice: g.monthlyPrice ?? c.monthlyPrice, enrolledStudentIds: g.studentIds }));
    });
  }

  readonly editingTeacher = computed(() => {
    const e = this.editing();
    return typeof e === 'number' ? this.teachersService.getById(e) : undefined;
  });

  readonly draftErrors = computed(() => {
    this.draftTick();
    const d = this.draft;
    const errors: string[] = [];
    if (!d.firstName.trim() || !d.lastName.trim()) errors.push('Le prénom et le nom sont obligatoires.');
    if (!d.phone.trim()) errors.push('Le téléphone est obligatoire : c’est par là que le centre joint l’enseignant.');
    if (!d.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) errors.push('Une adresse email valide est obligatoire : c’est son identifiant de connexion.');
    if (!d.specialty.trim()) errors.push('Choisissez une matière.');
    const amount = d.mode === 'fixed' ? d.fixedSalary : d.mode === 'percentage' ? d.percentageRate : d.ratePerStudent;
    if (amount === null || amount === undefined || +amount <= 0) {
      errors.push(d.mode === 'fixed' ? 'Indiquez le salaire mensuel.' : d.mode === 'percentage' ? 'Indiquez le pourcentage.' : 'Indiquez le montant par élève.');
    }
    return errors;
  });

  /** Live estimate shown under the pay fields — updates as classes are picked above, before anything is saved. */
  readonly draftEstimate = computed(() => {
    this.draftTick();
    const d = this.draft;
    const classes = this.effectiveRowsFor(d.classIds);
    const studentCount = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
    const owed = this.teachersService.getPayrollAmount({
      paymentMode: d.mode,
      fixedSalary: +(d.fixedSalary ?? 0),
      ratePerStudent: +(d.ratePerStudent ?? 0),
      percentageRate: +(d.percentageRate ?? 0),
    } as Teacher, classes);
    return { students: studentCount, owed };
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
      firstName: t.firstName, lastName: t.lastName, phone: t.phone, email: t.email,
      specialty: t.specialty, mode: t.paymentMode,
      fixedSalary: t.fixedSalary || null, ratePerStudent: t.ratePerStudent || null, percentageRate: t.percentageRate || null,
      active: t.status === 'active',
      classIds: [...t.classIds],
    };
    this.submitted.set(false);
    this.editing.set(t.id);
    this.touch();
    setTimeout(() => this.firstField()?.nativeElement.focus(), 60);
  }

  closeDrawer(): void {
    this.editing.set(null);
  }

  setSpecialty(s: string): void {
    this.draft.specialty = s;
    this.touch();
  }

  setMode(mode: PaymentMode): void {
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
    const payload = {
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      phone: formatPhone(d.phone),
      email: d.email.trim(),
      specialty: d.specialty,
      paymentMode: d.mode,
      fixedSalary: d.mode === 'fixed' ? Math.round(+(d.fixedSalary ?? 0)) : undefined,
      ratePerStudent: d.mode === 'per_student' ? Math.round(+(d.ratePerStudent ?? 0)) : undefined,
      percentageRate: d.mode === 'percentage' ? +(d.percentageRate ?? 0) : undefined,
      status: (d.active ? 'active' : 'inactive') as 'active' | 'inactive',
    };

    const target = this.editing();
    this.saving.set(true);
    if (target === 'new') {
      this.teachersService.add({ ...payload, classIds: d.classIds }).subscribe({
        next: res => {
          this.saving.set(false);
          this.editing.set(null);
          this.flash(res.data.id);
          this.classesService.loadClasses();
          this.notify(`${d.firstName} ${d.lastName} ajouté`);
          // Every real teacher gets an account at creation — reveal its
          // one-time password straight away, same as after a reset. The
          // background refetch triggered by add() hasn't landed yet, so
          // this stand-in is shown until the real record replaces it.
          if (res.data.plainPassword) {
            this.openAccessReveal({
              id: res.data.id, firstName: d.firstName, lastName: d.lastName,
              email: payload.email, phone: payload.phone, specialty: payload.specialty,
              paymentMode: payload.paymentMode, fixedSalary: payload.fixedSalary,
              ratePerStudent: payload.ratePerStudent, percentageRate: payload.percentageRate,
              classIds: d.classIds, status: payload.status, avatarColor: '#0d9488',
              access: { login: payload.email, state: 'active', lastLoginAt: null },
            } satisfies Teacher, res.data.plainPassword);
          }
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.toast.show(extractValidationError(err, 'Erreur lors de l’ajout'), 'error');
        },
      });
    } else if (typeof target === 'number') {
      this.teachersService.update(target, { ...payload, classIds: d.classIds }).subscribe({
        next: () => {
          this.saving.set(false);
          this.editing.set(null);
          this.flash(target);
          this.classesService.loadClasses();
          this.notify(`Fiche de ${d.firstName} ${d.lastName} enregistrée`);
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.toast.show(extractValidationError(err, 'Erreur lors de l’enregistrement'), 'error');
        },
      });
    }
  }

  // ── Delete (optimistic hide + undo, real delete once the window lapses) ──
  readonly confirming = signal<TeacherRow | null>(null);

  askDelete(row: TeacherRow): void {
    this.confirming.set(row);
  }

  confirmDelete(): void {
    const row = this.confirming();
    this.confirming.set(null);
    if (!row) return;
    const id = row.teacher.id;
    this.hiddenIds.update(set => new Set(set).add(id));

    let undone = false;
    this.notify(`${fullName(row.teacher)} supprimé`, () => {
      undone = true;
      this.hiddenIds.update(set => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    }, () => {
      if (undone) return;
      this.teachersService.delete(id).subscribe({
        next: () => this.hiddenIds.update(set => {
          const next = new Set(set);
          next.delete(id);
          return next;
        }),
        error: () => {
          this.hiddenIds.update(set => {
            const next = new Set(set);
            next.delete(id);
            return next;
          });
          this.toast.show('Impossible de supprimer cet enseignant', 'error');
        },
      });
    });
  }

  // ── Access panel ──────────────────────────────────────────────────
  readonly accessFor = signal<number | null>(null);
  /**
   * Falls back to `pendingReveal` right after creating a teacher: the
   * background refetch triggered by `add()` hasn't landed in
   * TeachersService yet, so `getById` would otherwise find nothing.
   */
  private readonly pendingReveal = signal<Teacher | null>(null);
  readonly accessTeacher = computed(() => this.teachersService.getById(this.accessFor() ?? -1) ?? this.pendingReveal());
  readonly workingAccess = signal(false);
  readonly showPassword = signal(true);
  /**
   * Plain password just created or reset. Kept only while the panel is
   * open: once closed, nobody (not even the owner) can read it again —
   * the backend never stores or re-returns it.
   */
  readonly revealed = signal<{ login: string; password: string } | null>(null);
  readonly copied = signal<'login' | 'password' | 'message' | null>(null);

  openAccess(t: Teacher): void {
    this.accessFor.set(t.id);
    this.revealed.set(null);
    this.showPassword.set(true);
  }

  /** Reveal a freshly generated password right after creating a teacher. */
  private openAccessReveal(teacher: Teacher, password: string): void {
    this.pendingReveal.set(teacher);
    this.accessFor.set(teacher.id);
    this.showPassword.set(true);
    this.revealed.set({ login: teacher.email, password });
  }

  closeAccess(): void {
    this.accessFor.set(null);
    this.revealed.set(null);
    this.pendingReveal.set(null);
  }

  resetPassword(): void {
    const t = this.accessTeacher();
    if (!t) return;
    this.workingAccess.set(true);
    this.teachersService.resetPassword(t.id).subscribe({
      next: res => {
        this.workingAccess.set(false);
        this.revealed.set({ login: t.email, password: res.data.plainPassword });
        this.showPassword.set(true);
        this.notify(`Nouveau mot de passe généré pour ${fullName(t)}. L’ancien ne fonctionne plus.`);
      },
      error: () => {
        this.workingAccess.set(false);
        this.toast.show('Impossible de régénérer le mot de passe', 'error');
      },
    });
  }

  toggleSuspend(): void {
    const t = this.accessTeacher();
    if (!t) return;
    if (t.access.state === 'active') {
      this.runAccessAction(this.teachersService.suspendAccess(t.id), `Accès de ${fullName(t)} suspendu`);
    } else {
      this.runAccessAction(this.teachersService.reactivateAccess(t.id), `Accès de ${fullName(t)} réactivé`);
    }
  }

  revokeAccess(): void {
    const t = this.accessTeacher();
    if (!t) return;
    this.runAccessAction(this.teachersService.revokeAccess(t.id), `Accès de ${fullName(t)} révoqué`);
  }

  reactivateAccess(): void {
    const t = this.accessTeacher();
    if (!t) return;
    this.runAccessAction(this.teachersService.reactivateAccess(t.id), `Accès de ${fullName(t)} réactivé`);
  }

  private runAccessAction(request: ReturnType<TeachersService['suspendAccess']>, message: string): void {
    this.workingAccess.set(true);
    request.subscribe({
      next: () => {
        this.workingAccess.set(false);
        this.notify(message);
      },
      error: () => {
        this.workingAccess.set(false);
        this.toast.show('Action impossible', 'error');
      },
    });
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

  mailtoUrl(): string {
    const t = this.accessTeacher();
    if (!t?.email) return '';
    const subject = encodeURIComponent('Vos accès Moujtahid');
    const body = encodeURIComponent(this.credentialsMessage());
    return `mailto:${t.email}?subject=${subject}&body=${body}`;
  }

  async copy(what: 'login' | 'password' | 'message'): Promise<void> {
    const r = this.revealed();
    const text = what === 'message' ? this.credentialsMessage() : what === 'login' ? (r?.login ?? this.accessTeacher()?.email ?? '') : (r?.password ?? '');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(what);
      setTimeout(() => this.copied.set(null), 1600);
    } catch {
      this.notify('Copie impossible : sélectionnez le texte à la main.');
    }
  }

  // ── Snackbar ──────────────────────────────────────────────────────
  readonly snack = signal<{ text: string; undo?: () => void; id: number } | null>(null);
  private snackTimer?: ReturnType<typeof setTimeout>;

  private notify(text: string, undo?: () => void, onExpire?: () => void): void {
    clearTimeout(this.snackTimer);
    this.snack.set({ text, undo, id: Date.now() });
    this.snackTimer = setTimeout(() => {
      this.snack.set(null);
      onExpire?.();
    }, undo ? 6000 : 3500);
  }

  runUndo(): void {
    const s = this.snack();
    clearTimeout(this.snackTimer);
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

function extractValidationError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.status === 422 && err.error?.errors) {
    const messages = Object.values(err.error.errors as Record<string, string[]>).flat();
    return messages.join('. ');
  }
  if (err instanceof HttpErrorResponse && err.error?.message) {
    return err.error.message;
  }
  return fallback;
}
