import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Teacher } from '../models/teacher.model';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse, PaginatedApiResponse, PaginationMeta } from '../models/api-response.model';

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2', '#be185d', '#b45309'];

export interface TeacherPageFilters {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
}

export interface TeacherSummary {
  total: number;
  active: number;
  payroll: number;
}

@Injectable({ providedIn: 'root' })
export class TeachersService {
  private http = inject(HttpClient);
  private pageCache = new Map<string, PaginatedApiResponse<Teacher, TeacherSummary>>();
  private lastPageFilters: TeacherPageFilters = { page: 1, perPage: 8 };

  teachers = signal<Teacher[]>([]);
  pagedTeachers = signal<Teacher[]>([]);
  pagination = signal<PaginationMeta>({ current_page: 1, per_page: 8, total: 0, last_page: 1, from: null, to: null });
  summary = signal<TeacherSummary>({ total: 0, active: 0, payroll: 0 });
  loadingPage = signal(false);

  constructor() {
    this.loadTeachers();
    this.loadTeacherPage();
  }

  loadTeachers(): void {
    this.http.get<ApiResponse<Teacher[]>>(`${environment.apiUrl}/v1/teachers`, {
      params: new HttpParams().set('all', 'true'),
    }).subscribe(res => {
      if (res.success) {
        this.teachers.set(this.withAvatarColors(res.data));
      }
    });
  }

  loadTeacherPage(filters: TeacherPageFilters = this.lastPageFilters): void {
    const normalized = { page: 1, perPage: 8, ...filters };
    this.lastPageFilters = normalized;
    const key = this.cacheKey(normalized);
    const cached = this.pageCache.get(key);

    if (cached) {
      this.applyPage(cached);
      return;
    }

    this.loadingPage.set(true);
    this.http.get<PaginatedApiResponse<Teacher, TeacherSummary>>(`${environment.apiUrl}/v1/teachers`, {
      params: this.params(normalized),
    }).subscribe({
      next: res => {
        if (res.success) {
          this.pageCache.set(key, res);
          this.applyPage(res);
        }
      },
      complete: () => this.loadingPage.set(false),
      error: () => this.loadingPage.set(false),
    });
  }

  getById(id: number): Teacher | undefined {
    return this.teachers().find(t => t.id === id);
  }

  add(data: Omit<Teacher, 'id' | 'avatarColor'>): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/teachers`, data).pipe(
      tap(() => this.refreshLists())
    );
  }

  update(id: number, data: Partial<Teacher>): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/teachers/${id}`, data).pipe(
      tap(() => this.refreshLists())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/teachers/${id}`).pipe(
      tap(() => this.refreshLists())
    );
  }

  getPayrollAmount(teacher: Teacher, studentCount: number): number {
    if (teacher.paymentMode === 'fixed') {
      return teacher.fixedSalary ?? 0;
    }
    return (teacher.ratePerStudent ?? 0) * studentCount;
  }

  private applyPage(res: PaginatedApiResponse<Teacher, TeacherSummary>): void {
    this.pagedTeachers.set(this.withAvatarColors(res.data));
    this.pagination.set(res.meta.pagination);
    this.summary.set(res.meta.summary ?? this.summary());
  }

  private refreshLists(): void {
    this.pageCache.clear();
    this.loadTeachers();
    this.loadTeacherPage(this.lastPageFilters);
  }

  private withAvatarColors(teachers: Teacher[]): Teacher[] {
    return teachers.map((teacher, index) => ({
      ...teacher,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    }));
  }

  private params(filters: TeacherPageFilters): HttpParams {
    let params = new HttpParams()
      .set('page', String(filters.page ?? 1))
      .set('per_page', String(filters.perPage ?? 8));

    if (filters.search) params = params.set('search', filters.search);
    if (filters.status) params = params.set('status', filters.status);

    return params;
  }

  private cacheKey(filters: TeacherPageFilters): string {
    return JSON.stringify({
      page: filters.page ?? 1,
      perPage: filters.perPage ?? 8,
      search: filters.search ?? '',
      status: filters.status ?? '',
    });
  }
}
