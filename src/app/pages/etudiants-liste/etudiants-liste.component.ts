import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { StudentsService } from '../../services/students.service';
import { AcademicLevelsService } from '../../services/academic-levels.service';
import { ToastService } from '../../services/toast.service';
import { Student } from '../../models/student.model';
import { CentreStore, DAY_SHORT, GroupRow, Slot } from '../../shared/centre.store';
import { CaisseStore } from '../caisse/caisse.store';

const PER_PAGE = 15;

interface StudentDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  school: string;
  level: string;
  status: 'active' | 'inactive';
  parentName: string;
  parentPhone: string;
  parentWhatsapp: string;
}

function draftFrom(s: Student): StudentDraft {
  return {
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email ?? '',
    phone: s.phone ?? '',
    birthDate: s.birthDate ?? '',
    school: s.school ?? '',
    level: s.level ?? '',
    status: s.status,
    parentName: s.parentName ?? '',
    parentPhone: s.parentPhone ?? '',
    parentWhatsapp: s.parentWhatsapp ?? '',
  };
}

function blankDraft(): StudentDraft {
  return { firstName: '', lastName: '', email: '', phone: '', birthDate: '', school: '', level: '', status: 'active', parentName: '', parentPhone: '', parentWhatsapp: '' };
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function endOf(s: Slot): string {
  const t = toMin(s.start) + +s.duration;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/**
 * Étudiants — every student in the centre, searchable and paginated
 * (real, server-side: StudentsService.pagedStudents/pagination, 15 at a
 * time). Same grammar as Enseignants: one flat list split by hairlines.
 */
@Component({
  selector: 'app-etudiants-liste',
  imports: [FormsModule, RouterLink, AppBarComponent],
  templateUrl: './etudiants-liste.component.html',
  styleUrl: './etudiants-liste.component.css',
  // CaisseStore isn't providedIn: 'root' (it's scoped per-feature) — provide
  // our own instance here just to reuse its effective-price computation.
  providers: [CaisseStore],
})
export class EtudiantsListeComponent {
  private studentsService = inject(StudentsService);
  private centre = inject(CentreStore);
  private academicLevelsService = inject(AcademicLevelsService);
  private toast = inject(ToastService);
  private caisseStore = inject(CaisseStore);

  readonly query = signal('');
  readonly pagination = this.studentsService.pagination;
  readonly summary = this.studentsService.summary;
  readonly loading = this.studentsService.loadingPage;
  readonly levels = computed(() => this.academicLevelsService.levels().map(l => l.name));

  // Optimistically hidden while a delete's undo window is running — see confirmDelete().
  private readonly hiddenIds = signal<Set<number>>(new Set());
  readonly students = computed(() => this.studentsService.pagedStudents().filter(s => !this.hiddenIds().has(s.id)));

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.request(1);
  }

  onQuery(value: string): void {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.request(1), 300);
  }

  clearSearch(): void {
    clearTimeout(this.searchTimer);
    this.query.set('');
    this.request(1);
  }

  previousPage(): void {
    if (this.pagination().current_page > 1) this.request(this.pagination().current_page - 1);
  }

  nextPage(): void {
    if (this.pagination().current_page < this.pagination().last_page) this.request(this.pagination().current_page + 1);
  }

  rangeLabel(): string {
    const p = this.pagination();
    return p.total ? `${p.from}–${p.to} sur ${p.total}` : 'Aucun résultat';
  }

  initials(s: Student): string {
    return `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();
  }

  fullName(s: Student): string {
    return `${s.firstName} ${s.lastName}`;
  }

  paymentLabel(status: Student['paymentStatus']): string {
    if (status === 'paid') return 'Payé';
    if (status === 'partial') return 'Partiel';
    if (status === 'overdue') return 'Impayé';
    return 'À venir';
  }

  /** What this student is billed every month, across every class they're enrolled in — same effective price Caisse bills from (respects a per-student discount). */
  monthlyTotal(s: Student): number {
    const enrollments = this.caisseStore.student(s.id)?.enrollments ?? [];
    return enrollments.reduce((sum, e) => sum + e.price, 0);
  }

  // ── Expand a row to show every group this student is in ────────────
  readonly expanded = signal<Set<number>>(new Set());

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  toggle(id: number): void {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  groupsOf(studentId: number): GroupRow[] {
    return this.centre.groups().filter(g => g.studentIds.includes(studentId));
  }

  formatSlot(s: Slot): string {
    if (!s.days.length) return 'À planifier';
    return `${[...s.days].sort().map(d => DAY_SHORT[d]).join(', ')} ${s.start}–${endOf(s)}`;
  }

  private request(page: number): void {
    this.studentsService.loadStudentPage({ page, perPage: PER_PAGE, search: this.query().trim() || undefined });
  }

  // ── Edit (basic info) ────────────────────────────────────────────
  readonly editing = signal<Student | null>(null);
  draft: StudentDraft = blankDraft();
  readonly saving = signal(false);

  openEdit(s: Student): void {
    this.draft = draftFrom(s);
    this.editing.set(s);
  }

  closeEdit(): void {
    this.editing.set(null);
  }

  save(): void {
    const target = this.editing();
    if (!target || this.saving()) return;
    this.saving.set(true);

    this.studentsService.update(target.id, { ...this.draft }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.notify(`Fiche de ${this.draft.firstName} ${this.draft.lastName} enregistrée`);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.show(extractValidationError(err, 'Erreur lors de l’enregistrement'), 'error');
      },
    });
  }

  // ── Delete (optimistic hide + undo, real delete once the window lapses) ──
  readonly confirming = signal<Student | null>(null);

  askDelete(s: Student): void {
    this.confirming.set(s);
  }

  confirmDelete(): void {
    const s = this.confirming();
    this.confirming.set(null);
    if (!s) return;
    const id = s.id;
    this.hiddenIds.update(set => new Set(set).add(id));

    let undone = false;
    this.notify(`${this.fullName(s)} supprimé`, () => {
      undone = true;
      this.hiddenIds.update(set => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    }, () => {
      if (undone) return;
      this.studentsService.delete(id).subscribe({
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
          this.toast.show('Impossible de supprimer cet élève', 'error');
        },
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirming()) this.confirming.set(null);
    else if (this.editing() && !this.saving()) this.closeEdit();
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
