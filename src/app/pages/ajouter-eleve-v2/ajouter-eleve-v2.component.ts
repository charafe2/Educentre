import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { AcademicLevelsService } from '../../services/academic-levels.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { StudentsService } from '../../services/students.service';
import { CentreService } from '../../services/centre.service';
import { Classe } from '../../models/classe.model';
import { sameName } from '../../shared/centre.store';

type PaymentChoice = 'paid' | 'pending' | 'partial';

interface ReceiptLine {
  subject: string;
  price: number;
}

interface Receipt {
  studentName: string;
  level: string;
  date: string;
  lines: ReceiptLine[];
  total: number;
  amountPaid: number;
  status: PaymentChoice;
}

/** "Ajouter un élève": student info -> level -> its classes (each priced) -> a payment
 *  decision for the total due -> parent contact. One real call creates the student,
 *  its enrollments and (if any classes are picked) its enrollment-time Payment rows;
 *  a second wave of calls then drops the student into a group per picked class —
 *  the exact same two-step sequence "Nouvelle inscription" already uses in Etudiants. */
@Component({
  selector: 'app-ajouter-eleve-v2',
  imports: [FormsModule, RouterLink, AppBarComponent],
  templateUrl: './ajouter-eleve-v2.component.html',
  styleUrl: './ajouter-eleve-v2.component.css',
})
export class AjouterEleveV2Component {
  private academicLevelsService = inject(AcademicLevelsService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private studentsService = inject(StudentsService);
  private centreService = inject(CentreService);
  private router = inject(Router);

  readonly levels = computed(() => this.academicLevelsService.levels().map(l => l.name));

  readonly form = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    level: '',
    parentName: '',
    parentPhone: '',
    parentWhatsapp: '',
    /** When their billing actually starts — Caisse never shows a month
     *  before this as unpaid. Defaults to today; back- or post-date it for
     *  a student who joined earlier or starts next month. */
    enrolledAt: toDateInput(new Date()),
  };

  readonly selectedClassIds = signal<number[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly receipt = signal<Receipt | null>(null);

  readonly paymentChoice = signal<PaymentChoice>('pending');
  readonly amountPaid = signal<number | null>(null);

  /** This level's classes, each shown as a priced, checkable subject.
   *  A plain method (not `computed()`): `form` is an ordinary object, not a
   *  signal, so a memoized computed would never see `form.level` change —
   *  re-run on every change-detection pass instead, same as draftErrors()
   *  in groupes-v2. */
  classesForLevel(): Classe[] {
    const level = this.form.level;
    if (!level) return [];
    return this.classesService.classes().filter(c => sameName(c.level, level));
  }

  selectedClasses(): Classe[] {
    return this.classesForLevel().filter(c => this.selectedClassIds().includes(c.id));
  }

  /**
   * A class's own `monthlyPrice` is only the fallback — its groups can each
   * override it (set from Groupes), and a brand-new enrollment hasn't been
   * placed in one yet, so the cheapest existing group is the best estimate
   * (matching what an eventual override-free new group would inherit, and
   * what the backend now uses for the real enrollment-time Payment split).
   */
  classPrice(c: Classe): number {
    const groups = this.groupsService.getGroupsForClasse(c.id);
    if (!groups.length) return c.monthlyPrice;
    return Math.min(...groups.map(g => g.monthlyPrice ?? c.monthlyPrice));
  }

  /** The total the owner can lower (or raise) for this one student — a
   *  sibling discount, a scholarship… Defaults to the sum of each selected
   *  class's own price; once overridden it's split across the classes
   *  proportionally to their default price (same split the backend already
   *  uses for a plain multi-class payment), and each class's share is what's
   *  billed every month from then on, not just at enrollment. */
  readonly totalOverride = signal<number | null>(null);

  defaultTotal(): number {
    return this.selectedClasses().reduce((sum, c) => sum + this.classPrice(c), 0);
  }

  total(): number {
    return this.totalOverride() ?? this.defaultTotal();
  }

  setTotal(value: number | string): void {
    this.totalOverride.set(Math.max(0, Math.round(+value || 0)));
  }

  /** This class's share of total() — its own price once no override is set;
   *  otherwise a proportional slice of the override, the last selected class
   *  absorbing the rounding remainder so shares always sum to total(). */
  effectivePrice(c: Classe): number {
    const override = this.totalOverride();
    if (override === null) return this.classPrice(c);

    const classes = this.selectedClasses();
    const rawTotal = this.defaultTotal();
    let remaining = override;
    for (let i = 0; i < classes.length; i++) {
      const isLast = i === classes.length - 1;
      const share = isLast
        ? remaining
        : Math.round(override * (rawTotal > 0 ? this.classPrice(classes[i]) / rawTotal : 1 / classes.length));
      if (classes[i].id === c.id) return share;
      remaining -= share;
    }
    return this.classPrice(c);
  }

  remaining(): number {
    return Math.max(0, this.total() - (this.amountPaid() ?? 0));
  }

  canSubmit(): boolean {
    return this.form.firstName.trim().length > 0 &&
      this.form.lastName.trim().length > 0 &&
      this.form.phone.trim().length > 0 &&
      !this.saving();
  }

  onLevelChange(level: string): void {
    this.form.level = level;
    // Dropping the level invalidates any class picked under the previous one.
    this.selectedClassIds.update(ids => ids.filter(id => this.classesForLevel().some(c => c.id === id)));
  }

  toggleClass(classId: number): void {
    this.selectedClassIds.update(ids =>
      ids.includes(classId) ? ids.filter(id => id !== classId) : [...ids, classId],
    );
    // Which classes make up the total changed, so a manually-typed total no
    // longer means what it did — fall back to the sum of default prices.
    this.totalOverride.set(null);
    if (this.paymentChoice() === 'partial') this.amountPaid.set(null);
  }

  setPaymentChoice(choice: PaymentChoice): void {
    this.paymentChoice.set(choice);
    if (choice !== 'partial') this.amountPaid.set(null);
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.error.set('');

    if (this.selectedClasses().length > 0 && this.paymentChoice() === 'partial') {
      const paid = this.amountPaid() ?? 0;
      if (paid <= 0 || paid >= this.total()) {
        this.error.set('Indiquez un montant déjà payé strictement compris entre 0 et le total.');
        return;
      }
    }

    this.saving.set(true);
    const classIds = this.selectedClassIds();
    const hasClasses = classIds.length > 0;

    this.studentsService.add({
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      email: this.form.email.trim() || undefined,
      phone: this.form.phone.trim(),
      level: this.form.level || undefined,
      status: 'active',
      parentName: this.form.parentName.trim() || undefined,
      parentPhone: this.form.parentPhone.trim() || undefined,
      parentWhatsapp: this.form.parentWhatsapp.trim() || undefined,
      enrolledAt: this.form.enrolledAt || undefined,
      enrolledClassIds: classIds,
      ...(hasClasses ? {
        totalAmount: this.total(),
        paymentStatus: this.paymentChoice(),
        amountPaid: this.paymentChoice() === 'partial' ? this.amountPaid() : undefined,
        classPrices: Object.fromEntries(this.selectedClasses().map(c => [c.id, this.effectivePrice(c)])),
      } : {}),
    }).subscribe({
      next: res => {
        const studentId = res.data.id;

        const finish = () => {
          this.classesService.loadClasses();
          this.saving.set(false);
          if (hasClasses && this.paymentChoice() !== 'pending') {
            this.receipt.set({
              studentName: `${this.form.firstName.trim()} ${this.form.lastName.trim()}`,
              level: this.form.level,
              date: new Date().toISOString(),
              lines: this.selectedClasses().map(c => ({ subject: c.subject, price: this.effectivePrice(c) })),
              total: this.total(),
              amountPaid: this.paymentChoice() === 'paid' ? this.total() : (this.amountPaid() ?? 0),
              status: this.paymentChoice(),
            });
          } else {
            this.router.navigateByUrl('/accueil');
          }
        };

        if (!hasClasses) { finish(); return; }
        forkJoin(classIds.map(id => this.groupsService.addStudent(id, studentId))).subscribe({
          next: () => finish(),
          error: () => finish(),
        });
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(extractValidationError(err, "Échec de l'ajout de l'élève : vérifiez la connexion et réessayez."));
      },
    });
  }

  print(): void {
    setTimeout(() => window.print(), 50);
  }

  done(): void {
    this.router.navigateByUrl('/accueil');
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  readonly centre = this.centreService.centreInfo;

  constructor() {
    this.centreService.load();
  }
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
