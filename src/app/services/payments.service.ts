import { Injectable, signal, inject } from '@angular/core';
import { Payment, PaymentMethod, PaymentStatus } from '../models/payment.model';
import { StudentsService } from './students.service';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private studentsService = inject(StudentsService);
  private nextId = signal(11);

  payments = signal<Payment[]>([
    { id: 1, studentId: 1, classeId: 1, periodMonth: '2025-05', amount: 350, status: 'paid', method: 'Espèces', paidAt: '2025-05-01', invoiceGenerated: true },
    { id: 2, studentId: 2, classeId: 3, periodMonth: '2025-05', amount: 280, status: 'paid', method: 'Virement', paidAt: '2025-05-02', invoiceGenerated: true },
    { id: 3, studentId: 3, classeId: 6, periodMonth: '2025-05', amount: 300, status: 'pending', invoiceGenerated: false },
    { id: 4, studentId: 4, classeId: 2, periodMonth: '2025-04', amount: 350, status: 'overdue', invoiceGenerated: false },
    { id: 5, studentId: 5, classeId: 4, periodMonth: '2025-05', amount: 320, status: 'paid', method: 'Virement', paidAt: '2025-05-04', invoiceGenerated: true },
    { id: 6, studentId: 6, classeId: 5, periodMonth: '2025-04', amount: 290, status: 'overdue', invoiceGenerated: false },
    { id: 7, studentId: 7, classeId: 1, periodMonth: '2025-05', amount: 350, status: 'pending', invoiceGenerated: false },
    { id: 8, studentId: 8, classeId: 3, periodMonth: '2025-04', amount: 280, status: 'overdue', invoiceGenerated: false },
    { id: 9, studentId: 1, classeId: 2, periodMonth: '2025-05', amount: 310, status: 'paid', method: 'Virement', paidAt: '2025-05-05', invoiceGenerated: true },
    { id: 10, studentId: 2, classeId: 2, periodMonth: '2025-05', amount: 280, status: 'paid', method: 'Espèces', paidAt: '2025-05-06', invoiceGenerated: true },
  ]);

  getByStudent(studentId: number): Payment[] {
    return this.payments().filter(p => p.studentId === studentId);
  }

  getTotals(): { totalPaid: number; totalPending: number; totalOverdue: number } {
    const all = this.payments();
    return {
      totalPaid: all.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      totalPending: all.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
      totalOverdue: all.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0),
    };
  }

  add(data: Omit<Payment, 'id'>): number {
    const id = this.nextId();
    this.payments.update(list => [...list, { ...data, id }]);
    this.nextId.update(n => n + 1);
    this.recalcStudentStatus(data.studentId);
    return id;
  }

  update(id: number, data: Partial<Payment>): void {
    const payment = this.payments().find(p => p.id === id);
    this.payments.update(list => list.map(p => p.id === id ? { ...p, ...data } : p));
    if (payment) this.recalcStudentStatus(payment.studentId);
  }

  delete(id: number): void {
    const payment = this.payments().find(p => p.id === id);
    this.payments.update(list => list.filter(p => p.id !== id));
    if (payment) this.recalcStudentStatus(payment.studentId);
  }

  markAsPaid(id: number, method: PaymentMethod): void {
    const payment = this.payments().find(p => p.id === id);
    this.payments.update(list => list.map(p =>
      p.id === id
        ? { ...p, status: 'paid', method, paidAt: new Date().toLocaleDateString('fr-MA') }
        : p
    ));
    if (payment) this.recalcStudentStatus(payment.studentId);
  }

  private recalcStudentStatus(studentId: number): void {
    const studentPayments = this.payments().filter(p => p.studentId === studentId);
    let worstStatus: PaymentStatus = 'paid';
    for (const p of studentPayments) {
      if (p.status === 'overdue') { worstStatus = 'overdue'; break; }
      if (p.status === 'pending') worstStatus = 'pending';
    }
    this.studentsService.setPaymentStatus(studentId, worstStatus);
  }

  getMonthlyRevenue(): Array<{ month: string; amount: number }> {
    const map = new Map<string, number>();
    this.payments()
      .filter(p => p.status === 'paid')
      .forEach(p => {
        const current = map.get(p.periodMonth) ?? 0;
        map.set(p.periodMonth, current + p.amount);
      });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount }));
  }
}
