import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Student } from '../models/student.model';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiResponse, PaginatedApiResponse, PaginationMeta } from '../models/api-response.model';

export interface StudentPageFilters {
  page?: number;
  perPage?: number;
  search?: string;
  level?: string;
  status?: string;
  paymentStatus?: string;
}

export interface StudentSummary {
  total: number;
  active: number;
  inactive: number;
  overduePayments: number;
}

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private http = inject(HttpClient);
  private lastPageFilters: StudentPageFilters = { page: 1, perPage: 8 };

  students = signal<Student[]>([]);
  pagedStudents = signal<Student[]>([]);
  pagination = signal<PaginationMeta>({ current_page: 1, per_page: 8, total: 0, last_page: 1, from: null, to: null });
  summary = signal<StudentSummary>({ total: 0, active: 0, inactive: 0, overduePayments: 0 });
  loadingPage = signal(false);

  constructor() {
    this.loadStudents();
    this.loadStudentPage();
  }

  loadStudents(): void {
    this.http.get<ApiResponse<Student[]>>(`${environment.apiUrl}/v1/students`, {
      params: new HttpParams().set('all', 'true'),
    }).subscribe(res => {
      if (res.success) {
        this.students.set(res.data);
      }
    });
  }

  loadStudentPage(filters: StudentPageFilters = this.lastPageFilters): void {
    const normalized = { page: 1, perPage: 8, ...filters };
    this.lastPageFilters = normalized;

    this.loadingPage.set(true);
    this.http.get<PaginatedApiResponse<Student, StudentSummary>>(`${environment.apiUrl}/v1/students`, {
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

  getById(id: number): Student | undefined {
    return this.students().find(s => s.id === id);
  }

  add(data: any): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/students`, data).pipe(
      tap(() => this.refreshLists())
    );
  }

  update(id: number, data: Partial<Student>): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/students/${id}`, data).pipe(
      tap(() => this.refreshLists())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/students/${id}`).pipe(
      tap(() => this.refreshLists())
    );
  }

  setPaymentStatus(studentId: number, status: 'paid' | 'pending' | 'overdue'): void {
    this.students.update(list => list.map(s => s.id === studentId ? { ...s, paymentStatus: status } : s));
  }

  private applyPage(res: PaginatedApiResponse<Student, StudentSummary>): void {
    this.pagedStudents.set(res.data);
    this.pagination.set(res.meta.pagination);
    this.summary.set(res.meta.summary ?? this.summary());
  }

  private refreshLists(): void {
    this.loadStudents();
    this.loadStudentPage(this.lastPageFilters);
  }

  private params(filters: StudentPageFilters): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 1))
      .set('per_page', String(filters.perPage ?? 8));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.level) params = params.set('level', filters.level);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.paymentStatus) params = params.set('payment_status', filters.paymentStatus);

    return params;
  }
}
