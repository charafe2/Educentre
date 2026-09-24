import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { ToastService } from '../../services/toast.service';
import { ReceiptCustomizationService } from '../../services/receipt-customization.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { TeacherPayslipPreviewComponent } from '../../components/teacher-payslip-preview/teacher-payslip-preview.component';
import { Teacher } from '../../models/teacher.model';
import { Classe } from '../../models/classe.model';
import { Group } from '../../models/group.model';
import { TeacherPayslipData } from '../../models/teacher-payslip.model';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';
import { currentMonthKey } from '../../utils/current-month.util';

/** Last 12 months (this one first), 'YYYY-MM' value + French "Mois Année" label. */
function payslipMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = formatter.format(date).replace(/^\w/, c => c.toUpperCase());
    return { value, label };
  });
}

interface TeacherForm {
  firstName: string; lastName: string; email: string; phone: string;
  specialty: string; paymentMode: 'fixed' | 'per_student' | 'percentage';
  fixedSalary: number; ratePerStudent: number; percentageRate: number;
  status: 'active' | 'inactive'; classIds: number[];
}

interface TeacherRow {
  teacher: Teacher;
  classes: Classe[];
  groups: { classe: Classe; groups: Group[] }[];
  studentCount: number;
  salary: number;
}

@Component({
  selector: 'app-professeurs',
  imports: [NgClass, FormsModule, ModalComponent, TeacherPayslipPreviewComponent, TranslatePipe],
  templateUrl: './professeurs.component.html',
  styleUrl: './professeurs.component.css',
})
export class ProfesseursComponent {
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private receiptCustomization = inject(ReceiptCustomizationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  searchTerm = signal('');
  statusFilter = signal('');

  teachers = this.teachersService.pagedTeachers;
  pagination = this.teachersService.pagination;
  teacherSummary = this.teachersService.summary;
  loadingPage = this.teachersService.loadingPage;
  classes = this.classesService.classes;

  filteredTeachers = computed(() => this.teachers());

  teacherRows = computed<TeacherRow[]>(() => {
    const allClasses = this.classes();
    return this.filteredTeachers().map(teacher => {
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

  totalCount = computed(() => this.teacherSummary().total);
  activeCount = computed(() => this.teacherSummary().active);
  totalPayroll = computed(() => this.teacherSummary().payroll);
  resultCount = computed(() => this.pagination().total);
  pageRangeLabel = computed(() => {
    const page = this.pagination();
    if (!page.total) return this.t('teachers.noResult');
    return this.t('teachers.rangeLabel', { from: page.from ?? 0, to: page.to ?? 0, total: page.total });
  });

  showModal = signal(false);
  editingTeacher = signal<Teacher | null>(null);

  formData: TeacherForm = {
    firstName: '', lastName: '', email: '', phone: '',
    specialty: '', paymentMode: 'fixed',
    fixedSalary: 0, ratePerStudent: 0, percentageRate: 0,
    status: 'active', classIds: [],
  };

  openAdd(): void {
    this.formData = {
      firstName: '', lastName: '', email: '', phone: '', specialty: '',
      paymentMode: 'fixed', fixedSalary: 0, ratePerStudent: 0, percentageRate: 0,
      status: 'active', classIds: [],
    };
    this.editingTeacher.set(null);
    this.showModal.set(true);
  }

  openEdit(t: Teacher): void {
    this.formData = {
      firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone,
      specialty: t.specialty, paymentMode: t.paymentMode,
      fixedSalary: t.fixedSalary ?? 0, ratePerStudent: t.ratePerStudent ?? 0,
      percentageRate: t.percentageRate ?? 0,
      status: t.status, classIds: [...t.classIds],
    };
    this.editingTeacher.set(t);
    this.showModal.set(true);
  }

  isClassSelected(classId: number): boolean {
    return this.formData.classIds.includes(classId);
  }

  toggleClass(classId: number): void {
    if (this.formData.classIds.includes(classId)) {
      this.formData = {
        ...this.formData,
        classIds: this.formData.classIds.filter(id => id !== classId),
      };
    } else {
      this.formData = {
        ...this.formData,
        classIds: [...this.formData.classIds, classId],
      };
    }
  }

  submit(): void {
    const editing = this.editingTeacher();
    const payload = {
      ...this.formData,
      fixedSalary: this.formData.paymentMode === 'fixed' ? this.formData.fixedSalary : undefined,
      ratePerStudent: this.formData.paymentMode === 'per_student' ? this.formData.ratePerStudent : undefined,
      percentageRate: this.formData.paymentMode === 'percentage' ? this.formData.percentageRate : undefined,
    };

    if (editing) {
      this.teachersService.update(editing.id, payload).subscribe({
        next: () => {
          this.toast.show(this.t('teachers.toastUpdated'));
          this.classesService.loadClasses();
          this.showModal.set(false);
        },
        error: (err: unknown) => this.toast.show(extractValidationError(err, this.t('teachers.toastError')), 'error'),
      });
    } else {
      this.teachersService.add(payload).subscribe({
        next: () => {
          this.toast.show(this.t('teachers.toastAdded'));
          this.classesService.loadClasses();
          this.showModal.set(false);
        },
        error: (err: unknown) => this.toast.show(extractValidationError(err, this.t('teachers.toastError')), 'error'),
      });
    }
  }

  deleteTeacher(t: Teacher): void {
    if (!confirm(this.t('teachers.confirmDelete', { name: `${t.firstName} ${t.lastName}` }))) return;

    this.classesService.classes()
      .filter(c => c.teacherId === t.id)
      .forEach(c => this.classesService.update(c.id, { teacherId: null }).subscribe());

    this.teachersService.delete(t.id).subscribe({
      next: () => this.toast.show(this.t('teachers.toastDeleted'), 'info'),
      error: () => this.toast.show(this.t('teachers.toastDeleteError'), 'error'),
    });
  }

  getInitials(firstName: string, lastName: string): string {
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  formatSalary(amount: number): string {
    return amount.toLocaleString('fr-MA') + ' ' + this.t('common.currency');
  }

  getPaymentModeLabel(mode: string): string {
    if (mode === 'fixed') return this.t('teachers.paymentFixe');
    if (mode === 'percentage') return this.t('teachers.paymentPercentage');
    return this.t('teachers.paymentPerStudent');
  }

  // ── Bulletin de paie (monthly payslip) ──────────────────────
  // Same concept as the student receipts in Documents: a live preview in a
  // modal, downloaded as a PDF on demand (see ReceiptCustomizationService),
  // no print dialog. No historical enrollment/pricing snapshot exists
  // anywhere in this app — every payslip, whichever month it's labeled for,
  // is always built from today's live classes/enrollment/rates. Downloading
  // "last month"'s payslip after a teacher's classes changed will not match
  // what was true back then.
  showPayslipFor = signal<Teacher | null>(null);
  payslipMonth = signal(currentMonthKey());
  payslipMonthOptions = payslipMonthOptions();
  receiptSettings = this.receiptCustomization.settings;
  downloadingPayslip = signal(false);

  openPayslip(teacher: Teacher): void {
    this.payslipMonth.set(currentMonthKey());
    this.showPayslipFor.set(teacher);
  }

  closePayslip(): void {
    this.showPayslipFor.set(null);
  }

  async downloadPayslip(): Promise<void> {
    const data = this.payslipData();
    if (!data) return;

    this.downloadingPayslip.set(true);
    try {
      await this.receiptCustomization.downloadTeacherPayslip(data, this.receiptSettings());
    } catch {
      this.toast.show(this.t('teachers.toastError'), 'error');
    } finally {
      this.downloadingPayslip.set(false);
    }
  }

  payslipData = computed<TeacherPayslipData | null>(() => {
    const teacher = this.showPayslipFor();
    if (!teacher) return null;

    const classes = this.classes().filter(c => teacher.classIds.includes(c.id));
    const classRows = this.teachersService.getPayslipClassRows(teacher, classes);
    const totalStudents = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
    const totalAmount = this.teachersService.getPayrollAmount(teacher, classes);

    return {
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      specialty: teacher.specialty,
      email: teacher.email,
      phone: teacher.phone,
      period: this.formatMonthLabel(this.payslipMonth()),
      generatedAt: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
      paymentMode: teacher.paymentMode,
      paymentModeLabel: this.getPaymentModeLabel(teacher.paymentMode),
      paymentModeDetail: this.getPaymentModeDetail(teacher),
      classRows,
      totalStudents,
      totalClasses: classes.length,
      totalAmount,
    };
  });

  private getPaymentModeDetail(teacher: Teacher): string {
    if (teacher.paymentMode === 'fixed') {
      return `Salaire fixe mensuel de ${this.formatSalary(teacher.fixedSalary ?? 0)}, indépendant du nombre d'étudiants.`;
    }
    if (teacher.paymentMode === 'percentage') {
      return `${teacher.percentageRate ?? 0}% du prix mensuel de chaque étudiant qui lui est assigné, quelle que soit la classe.`;
    }
    return `${this.formatSalary(teacher.ratePerStudent ?? 0)} par étudiant assigné, quelle que soit la classe.`;
  }

  private formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, (month || 1) - 1, 1);
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(date)
      .replace(/^\w/, c => c.toUpperCase());
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.loadPage(1);
  }

  onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.loadPage(1);
  }

  nextPage(): void {
    const page = this.pagination();
    if (page.current_page < page.last_page) {
      this.loadPage(page.current_page + 1);
    }
  }

  previousPage(): void {
    const page = this.pagination();
    if (page.current_page > 1) {
      this.loadPage(page.current_page - 1);
    }
  }

  private loadPage(page: number): void {
    this.teachersService.loadTeacherPage({
      page,
      perPage: 8,
      search: this.searchTerm().trim(),
      status: this.statusFilter(),
    });
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
