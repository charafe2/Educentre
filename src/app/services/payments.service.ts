import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Payment, PaymentMethod } from '../models/payment.model';
import { StudentsService } from './students.service';

export type PaymentPayload = Omit<Payment, 'id' | 'paidAt'> & { paidAt?: string };

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private http = inject(HttpClient);
  private studentsService = inject(StudentsService);

  payments = signal<Payment[]>([]);

  constructor() {
    this.loadPayments();
  }

  loadPayments(): void {
    this.http.get<ApiResponse<Payment[]>>(`${environment.apiUrl}/v1/payments`).subscribe(res => {
      if (res.success) {
        this.payments.set(res.data);
      }
    });
  }

  getByStudent(studentId: number): Payment[] {
    return this.payments().filter(payment => payment.studentId === studentId);
  }

  getTotals(): { totalPaid: number; totalPending: number; totalOverdue: number } {
    const payments = this.payments();

    return {
      totalPaid: payments.filter(payment => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0),
      totalPending: payments.filter(payment => payment.status === 'pending').reduce((sum, payment) => sum + payment.amount, 0),
      totalOverdue: payments.filter(payment => payment.status === 'overdue').reduce((sum, payment) => sum + payment.amount, 0),
    };
  }

  add(data: PaymentPayload): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(`${environment.apiUrl}/v1/payments`, data).pipe(
      tap(() => this.refreshRelatedData())
    );
  }

  update(id: number, data: Partial<PaymentPayload>): Observable<ApiResponse<Payment>> {
    return this.http.put<ApiResponse<Payment>>(`${environment.apiUrl}/v1/payments/${id}`, data).pipe(
      tap(() => this.refreshRelatedData())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/payments/${id}`).pipe(
      tap(() => this.refreshRelatedData())
    );
  }

  markAsPaid(id: number, method: PaymentMethod): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(`${environment.apiUrl}/v1/payments/${id}/mark-paid`, { method }).pipe(
      tap(() => this.refreshRelatedData())
    );
  }

  getMonthlyRevenue(): Array<{ month: string; amount: number }> {
    const revenueByMonth = new Map<string, number>();

    this.payments()
      .filter(payment => payment.status === 'paid')
      .forEach(payment => {
        revenueByMonth.set(payment.periodMonth, (revenueByMonth.get(payment.periodMonth) ?? 0) + payment.amount);
      });

    return Array.from(revenueByMonth.entries())
      .sort(([firstMonth], [secondMonth]) => firstMonth.localeCompare(secondMonth))
      .map(([month, amount]) => ({ month, amount }));
  }

  private refreshRelatedData(): void {
    this.loadPayments();
    this.studentsService.loadStudents();
  }
}
