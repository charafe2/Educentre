import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { StudentsService } from '../../services/students.service';
import { Student } from '../../models/student.model';
import { CentreStore, DAY_SHORT, GroupRow, Slot } from '../../shared/centre.store';

const PER_PAGE = 15;

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
})
export class EtudiantsListeComponent {
  private studentsService = inject(StudentsService);
  private centre = inject(CentreStore);

  readonly query = signal('');
  readonly students = this.studentsService.pagedStudents;
  readonly pagination = this.studentsService.pagination;
  readonly summary = this.studentsService.summary;
  readonly loading = this.studentsService.loadingPage;

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
}
