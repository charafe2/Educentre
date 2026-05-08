import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentsService } from '../../services/payments.service';
import { StudentsService } from '../../services/students.service';
import { ClassesService } from '../../services/classes.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Payment, PaymentMethod } from '../../models/payment.model';

@Component({
  selector: 'app-finances',
  imports: [NgClass, FormsModule, ModalComponent],
  templateUrl: './finances.component.html',
  styleUrl: './finances.component.css'
})
export class FinancesComponent {
  private paymentsService = inject(PaymentsService);
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private toast = inject(ToastService);

  selectedMonth = signal('');
  selectedStatus = signal('');

  payments = this.paymentsService.payments;
  students = this.studentsService.students;
  classes = this.classesService.classes;

  months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05'];
  monthLabels: Record<string, string> = {
    '2025-01': 'Janvier 2025', '2025-02': 'Février 2025', '2025-03': 'Mars 2025',
    '2025-04': 'Avril 2025', '2025-05': 'Mai 2025',
  };

  filteredPayments = computed(() => {
    const month = this.selectedMonth();
    const status = this.selectedStatus();
    return this.payments().filter(p => {
      const matchesMonth = !month || p.periodMonth === month;
      const matchesStatus = !status || p.status === status;
      return matchesMonth && matchesStatus;
    });
  });

  totals = computed(() => this.paymentsService.getTotals());

  totalAll = computed(() => {
    const t = this.totals();
    return t.totalPaid + t.totalPending + t.totalOverdue;
  });

  paidPct = computed(() => {
    const all = this.totalAll();
    return all ? Math.round((this.totals().totalPaid / all) * 100) : 0;
  });
  pendingPct = computed(() => {
    const all = this.totalAll();
    return all ? Math.round((this.totals().totalPending / all) * 100) : 0;
  });
  overduePct = computed(() => {
    const all = this.totalAll();
    return all ? Math.round((this.totals().totalOverdue / all) * 100) : 0;
  });

  paidCount = computed(() => this.payments().filter(p => p.status === 'paid').length);
  recoveryRate = computed(() => {
    const total = this.payments().length;
    return total ? Math.round((this.paidCount() / total) * 100) : 0;
  });

  showModal = signal(false);
  editingPayment = signal<Payment | null>(null);
  showPayModal = signal<Payment | null>(null);

  formData = {
    studentId: 0,
    classeId: 0,
    periodMonth: '2025-05',
    amount: 0,
    status: 'pending' as 'paid' | 'pending' | 'overdue',
    method: '' as PaymentMethod | '',
    note: '',
  };

  selectedPayMethod: PaymentMethod = 'Espèces';

  openAdd(): void {
    this.formData = {
      studentId: this.students()[0]?.id ?? 0,
      classeId: this.classes()[0]?.id ?? 0,
      periodMonth: '2025-05',
      amount: 0,
      status: 'pending',
      method: '',
      note: '',
    };
    this.editingPayment.set(null);
    this.showModal.set(true);
  }

  openEdit(p: Payment): void {
    this.formData = {
      studentId: p.studentId,
      classeId: p.classeId,
      periodMonth: p.periodMonth,
      amount: p.amount,
      status: p.status,
      method: p.method ?? '',
      note: p.note ?? '',
    };
    this.editingPayment.set(p);
    this.showModal.set(true);
  }

  submit(): void {
    const editing = this.editingPayment();
    const data = {
      studentId: this.formData.studentId,
      classeId: this.formData.classeId,
      periodMonth: this.formData.periodMonth,
      amount: this.formData.amount,
      status: this.formData.status,
      method: this.formData.method || undefined,
      note: this.formData.note || undefined,
      invoiceGenerated: false,
    } as Omit<Payment, 'id'>;

    if (editing) {
      this.paymentsService.update(editing.id, data);
      this.toast.show('Paiement mis à jour');
    } else {
      this.paymentsService.add(data);
      this.toast.show('Paiement ajouté');
    }
    this.showModal.set(false);
  }

  openMarkPaid(p: Payment): void {
    this.selectedPayMethod = 'Espèces';
    this.showPayModal.set(p);
  }

  confirmMarkPaid(): void {
    const p = this.showPayModal();
    if (p) {
      this.paymentsService.markAsPaid(p.id, this.selectedPayMethod);
      this.toast.show('Paiement marqué comme payé');
      this.showPayModal.set(null);
    }
  }

  deletePayment(p: Payment): void {
    if (confirm('Supprimer ce paiement ?')) {
      this.paymentsService.delete(p.id);
      this.toast.show('Paiement supprimé', 'info');
    }
  }

  getStudentName(studentId: number): string {
    const s = this.studentsService.getById(studentId);
    return s ? `${s.firstName} ${s.lastName}` : '—';
  }

  getClassName(classeId: number): string {
    const c = this.classesService.getById(classeId);
    return c ? c.name : '—';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { paid: 'Payé', pending: 'En attente', overdue: 'Impayé' };
    return map[status] || status;
  }

  getPeriodLabel(period: string): string {
    return this.monthLabels[period] ?? period;
  }

  onMonthChange(event: Event): void { this.selectedMonth.set((event.target as HTMLSelectElement).value); }
  onStatusChange(event: Event): void { this.selectedStatus.set((event.target as HTMLSelectElement).value); }
}
