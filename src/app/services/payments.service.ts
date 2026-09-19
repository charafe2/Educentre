import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, PaginatedApiResponse, PaginationMeta } from '../models/api-response.model';
import { Payment, PaymentMethod } from '../models/payment.model';
import { StudentsService } from './students.service';

export type PaymentPayload = Omit<Payment, 'id' | 'paidAt'> & { paidAt?: string };

export interface PaymentPageFilters {
  page?: number;
  perPage?: number;
  month?: string;
  status?: string;
}

export interface PaymentSummary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private http = inject(HttpClient);
  private studentsService = inject(StudentsService);
  private lastPageFilters: PaymentPageFilters = { page: 1, perPage: 8 };

  payments = signal<Payment[]>([]);
  pagedPayments = signal<Payment[]>([]);
  pagination = signal<PaginationMeta>({ current_page: 1, per_page: 8, total: 0, last_page: 1, from: null, to: null });
  summary = signal<PaymentSummary>({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
    totalCount: 0,
  });
  loadingPage = signal(false);

  constructor() {
    this.loadPayments();
    this.loadPaymentPage();
  }

  loadPayments(): void {
    this.http.get<ApiResponse<Payment[]>>(`${environment.apiUrl}/v1/payments`, {
      params: new HttpParams().set('all', 'true'),
    }).subscribe(res => {
      if (res.success) {
        this.payments.set(res.data);
      }
    });
  }

  loadPaymentPage(filters: PaymentPageFilters = this.lastPageFilters): void {
    const normalized = { page: 1, perPage: 8, ...filters };
    this.lastPageFilters = normalized;

    this.loadingPage.set(true);
    this.http.get<PaginatedApiResponse<Payment, PaymentSummary>>(`${environment.apiUrl}/v1/payments`, {
      params: this.params(normalized),
    }).subscribe({
      next: res => {
        if (res.success) {
          this.applyPage(res);
        }
      },
      complete: () => this.loadingPage.set(false),
      error: () => this.loadingPage.set(false),
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
    this.loadPaymentPage(this.lastPageFilters);
    this.studentsService.loadStudents();
    this.studentsService.loadStudentPage();
  }

  private applyPage(res: PaginatedApiResponse<Payment, PaymentSummary>): void {
    this.pagedPayments.set(res.data);
    this.pagination.set(res.meta.pagination);
    this.summary.set(res.meta.summary ?? this.summary());
  }

  private params(filters: PaymentPageFilters): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 1))
      .set('per_page', String(filters.perPage ?? 8));

    if (filters.month) params = params.set('month', filters.month);
    if (filters.status) params = params.set('status', filters.status);

    return params;
  }
}
