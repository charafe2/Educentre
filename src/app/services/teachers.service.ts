import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Teacher } from '../models/teacher.model';
import { Classe } from '../models/classe.model';
import { Session } from '../models/session.model';
import { PayslipClassRow } from '../models/teacher-payslip.model';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse, PaginatedApiResponse, PaginationMeta } from '../models/api-response.model';
import { SessionsService } from './sessions.service';

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2', '#be185d', '#b45309'];

/** A weekly recurring schedule is extrapolated to a month the same flat way a class's own monthly price already is — no calendar-exact week counting. */
export const WEEKS_PER_MONTH = 4;

/** Every non-cancelled weekly hour across the given classes, regardless of which group a session belongs to — same class-level fidelity as the other pay modes. Shared by TeachersService and TeacherPayrollService so `per_hour` computes identically everywhere. */
export function weeklyHoursForClasses(sessions: Session[], classes: Classe[]): number {
  const classIds = new Set(classes.map(c => c.id));
  return sessions
    .filter(s => classIds.has(s.classeId) && !s.isCancelled)
    .reduce((sum, s) => sum + (s.endHour - s.startHour), 0);
}

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
  private sessionsService = inject(SessionsService);
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

    this.loadingPage.set(true);
    this.http.get<PaginatedApiResponse<Teacher, TeacherSummary>>(`${environment.apiUrl}/v1/teachers`, {
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

  getById(id: number): Teacher | undefined {
    return this.teachers().find(t => t.id === id);
  }

  /** `plainPassword` is present once, in the create response only — the account is created together with the teacher. */
  add(data: Omit<Teacher, 'id' | 'avatarColor' | 'access'>): Observable<ApiResponse<{id: number; plainPassword?: string}>> {
    return this.http.post<ApiResponse<{id: number; plainPassword?: string}>>(`${environment.apiUrl}/v1/teachers`, data).pipe(
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

  /** Generates a new password server-side, returned once in plain text. */
  resetPassword(id: number): Observable<ApiResponse<{plainPassword: string}>> {
    return this.http.post<ApiResponse<{plainPassword: string}>>(`${environment.apiUrl}/v1/teachers/${id}/access/reset-password`, {}).pipe(
      tap(() => this.refreshLists())
    );
  }

  suspendAccess(id: number): Observable<ApiResponse<null>> {
    return this.setAccessState(id, 'suspend');
  }

  revokeAccess(id: number): Observable<ApiResponse<null>> {
    return this.setAccessState(id, 'revoke');
  }

  reactivateAccess(id: number): Observable<ApiResponse<null>> {
    return this.setAccessState(id, 'reactivate');
  }

  private setAccessState(id: number, action: 'suspend' | 'revoke' | 'reactivate'): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/v1/teachers/${id}/access/${action}`, {}).pipe(
      tap(() => this.refreshLists())
    );
  }

  /**
   * `percentage` mode needs each class's own monthlyPrice (a student in two
   * of the teacher's classes is owed a share of each class's price
   * separately), so this takes the teacher's classes rather than a plain
   * student count. `per_hour` needs the teacher's weekly scheduled hours
   * across those same classes, read from the already-loaded SessionsService.
   */
  getPayrollAmount(teacher: Teacher, classes: Classe[]): number {
    if (teacher.paymentMode === 'fixed') {
      return teacher.fixedSalary ?? 0;
    }
    if (teacher.paymentMode === 'percentage') {
      const rate = (teacher.percentageRate ?? 0) / 100;
      return classes.reduce((sum, c) => sum + c.monthlyPrice * c.enrolledStudentIds.length * rate, 0);
    }
    if (teacher.paymentMode === 'per_hour') {
      return (teacher.hourlyRate ?? 0) * weeklyHoursForClasses(this.sessionsService.sessions(), classes) * WEEKS_PER_MONTH;
    }
    const studentCount = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
    return (teacher.ratePerStudent ?? 0) * studentCount;
  }

  /**
   * Per-class breakdown behind `getPayrollAmount()`'s total — same math,
   * one row per class, used to itemize a payslip. `contribution` is 0 for
   * `fixed` mode since that pay isn't tied to any one class.
   */
  getPayslipClassRows(teacher: Teacher, classes: Classe[]): PayslipClassRow[] {
    const sessions = this.sessionsService.sessions();
    return classes.map(c => {
      let contribution = 0;
      if (teacher.paymentMode === 'percentage') {
        contribution = c.monthlyPrice * c.enrolledStudentIds.length * ((teacher.percentageRate ?? 0) / 100);
      } else if (teacher.paymentMode === 'per_student') {
        contribution = (teacher.ratePerStudent ?? 0) * c.enrolledStudentIds.length;
      } else if (teacher.paymentMode === 'per_hour') {
        contribution = (teacher.hourlyRate ?? 0) * weeklyHoursForClasses(sessions, [c]) * WEEKS_PER_MONTH;
      }
      return {
        className: c.name,
        subject: c.subject,
        level: c.level,
        studentCount: c.enrolledStudentIds.length,
        monthlyPrice: c.monthlyPrice,
        contribution,
      };
    });
  }

  private applyPage(res: PaginatedApiResponse<Teacher, TeacherSummary>): void {
    this.pagedTeachers.set(this.withAvatarColors(res.data));
    this.pagination.set(res.meta.pagination);
    this.summary.set(res.meta.summary ?? this.summary());
  }

  private refreshLists(): void {
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
}
