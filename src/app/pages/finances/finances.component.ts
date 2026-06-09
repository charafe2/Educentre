import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassesService } from '../../services/classes.service';
import { Payment, PaymentMethod } from '../../models/payment.model';
import { PaymentPayload, PaymentsService } from '../../services/payments.service';
import { StudentsService } from '../../services/students.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';

@Component({
  selector: 'app-finances',
  imports: [FormsModule, ModalComponent],
  templateUrl: './finances.component.html',
  styleUrl: './finances.component.css'
})
export class FinancesComponent {
  private paymentsService = inject(PaymentsService);
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private toast = inject(ToastService);
  private currentMonth = new Date().toISOString().slice(0, 7);

  selectedMonth = signal('');
  selectedStatus = signal('');

  payments = this.paymentsService.pagedPayments;
  paymentPagination = this.paymentsService.pagination;
  paymentSummary = this.paymentsService.summary;
  loadingPayments = this.paymentsService.loadingPage;
  students = this.studentsService.students;
  classes = this.classesService.classes;

  months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    return date.toISOString().slice(0, 7);
  });

  monthLabels = Object.fromEntries(
    this.months.map(month => [
      month,
      new Intl.DateTimeFormat('fr-MA', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01`))
    ])
  );

  filteredPayments = computed(() => this.payments());

  totals = computed(() => this.paymentSummary());
  totalAll = computed(() => {
    const totals = this.totals();
    return totals.totalPaid + totals.totalPending + totals.totalOverdue;
  });

  paidPct = computed(() => this.percentage(this.totals().totalPaid));
  pendingPct = computed(() => this.percentage(this.totals().totalPending));
  overduePct = computed(() => this.percentage(this.totals().totalOverdue));

  paidCount = computed(() => this.paymentSummary().paidCount);
  overdueCount = computed(() => this.paymentSummary().overdueCount);
  pendingCount = computed(() => this.paymentSummary().pendingCount);
  recoveryRate = computed(() => this.paymentSummary().totalCount
    ? Math.round((this.paidCount() / this.paymentSummary().totalCount) * 100)
    : 0
  );
  paymentRangeLabel = computed(() => {
    const page = this.paymentPagination();
    if (!page.total) return '0 resultat';
    return `${page.from ?? 0}-${page.to ?? 0} sur ${page.total}`;
  });

  showModal = signal(false);
  editingPayment = signal<Payment | null>(null);
  showPayModal = signal<Payment | null>(null);

  formData = this.emptyForm();
  selectedPayMethod: PaymentMethod = 'Espèces';

  openAdd(): void {
    this.formData = {
      ...this.emptyForm(),
      studentId: this.students()[0]?.id ?? 0,
      classeId: this.classes()[0]?.id ?? 0,
    };
    this.editingPayment.set(null);
    this.showModal.set(true);
  }

  openEdit(payment: Payment): void {
    this.formData = {
      studentId: payment.studentId,
      classeId: payment.classeId,
      periodMonth: payment.periodMonth,
      amount: payment.amount,
      status: payment.status,
      method: payment.method ?? '',
      note: payment.note ?? '',
    };
    this.editingPayment.set(payment);
    this.showModal.set(true);
  }

  submit(): void {
    const editing = this.editingPayment();
    const data: PaymentPayload = {
      studentId: this.formData.studentId,
      classeId: this.formData.classeId,
      periodMonth: this.formData.periodMonth,
      amount: this.formData.amount,
      status: this.formData.status,
      method: this.formData.method || undefined,
      note: this.formData.note || undefined,
      invoiceGenerated: editing?.invoiceGenerated ?? false,
    };

    const request = editing
      ? this.paymentsService.update(editing.id, data)
      : this.paymentsService.add(data);

    request.subscribe({
      next: () => {
        this.toast.show(editing ? 'Paiement mis à jour' : 'Paiement ajouté');
        this.showModal.set(false);
      },
      error: () => this.toast.show('Impossible d’enregistrer le paiement', 'error'),
    });
  }

  openMarkPaid(payment: Payment): void {
    this.selectedPayMethod = 'Espèces';
    this.showPayModal.set(payment);
  }

  confirmMarkPaid(): void {
    const payment = this.showPayModal();
    if (!payment) {
      return;
    }

    this.paymentsService.markAsPaid(payment.id, this.selectedPayMethod).subscribe({
      next: () => {
        this.toast.show('Paiement marqué comme payé');
        this.showPayModal.set(null);
      },
      error: () => this.toast.show('Impossible de marquer le paiement comme payé', 'error'),
    });
  }

  deletePayment(payment: Payment): void {
    if (!confirm('Supprimer ce paiement ?')) {
      return;
    }

    this.paymentsService.delete(payment.id).subscribe({
      next: () => this.toast.show('Paiement supprimé', 'info'),
      error: () => this.toast.show('Impossible de supprimer le paiement', 'error'),
    });
  }

  getStudentName(studentId: number): string {
    const student = this.studentsService.getById(studentId);
    return student ? `${student.firstName} ${student.lastName}` : '—';
  }

  getStudentInitials(studentId: number): string {
    const student = this.studentsService.getById(studentId);
    return student ? (student.firstName[0] + student.lastName[0]).toUpperCase() : '?';
  }

  getStudentColor(studentId: number): string {
    const colors = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2', '#be185d', '#b45309'];
    return colors[studentId % colors.length];
  }

  sendReminder(payment: Payment): void {
    this.toast.show(`Rappel envoyé à ${this.getStudentName(payment.studentId)}`);
  }

  getClassName(classeId: number): string {
    return this.classesService.getById(classeId)?.name ?? '—';
  }

  getStatusLabel(status: string): string {
    return ({ paid: 'Payé', pending: 'En attente', overdue: 'Impayé' } as Record<string, string>)[status] ?? status;
  }

  getPeriodLabel(period: string): string {
    return this.monthLabels[period] ?? new Intl.DateTimeFormat('fr-MA', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${period}-01`));
  }

  onMonthChange(event: Event): void {
    this.selectedMonth.set((event.target as HTMLSelectElement).value);
    this.loadPaymentPage(1);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.loadPaymentPage(1);
  }

  nextPaymentPage(): void {
    const page = this.paymentPagination();
    if (page.current_page < page.last_page) {
      this.loadPaymentPage(page.current_page + 1);
    }
  }

  previousPaymentPage(): void {
    const page = this.paymentPagination();
    if (page.current_page > 1) {
      this.loadPaymentPage(page.current_page - 1);
    }
  }

  private loadPaymentPage(page: number): void {
    this.paymentsService.loadPaymentPage({
      page,
      perPage: 8,
      month: this.selectedMonth(),
      status: this.selectedStatus(),
    });
  }

  private emptyForm(): {
    studentId: number;
    classeId: number;
    periodMonth: string;
    amount: number;
    status: 'paid' | 'pending' | 'overdue';
    method: PaymentMethod | '';
    note: string;
  } {
    return {
      studentId: 0,
      classeId: 0,
      periodMonth: this.currentMonth,
      amount: 0,
      status: 'pending',
      method: '',
      note: '',
    };
  }

  private percentage(amount: number): number {
    return this.totalAll() ? Math.round((amount / this.totalAll()) * 100) : 0;
  }
}
