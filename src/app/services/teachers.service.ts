import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Teacher } from '../models/teacher.model';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2', '#be185d', '#b45309'];

@Injectable({ providedIn: 'root' })
export class TeachersService {
  private http = inject(HttpClient);

  teachers = signal<Teacher[]>([]);

  constructor() {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.http.get<ApiResponse<Teacher[]>>(`${environment.apiUrl}/v1/teachers`).subscribe(res => {
      if (res.success) {
        this.teachers.set(res.data.map((t, i) => ({
          ...t,
          avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        })));
      }
    });
  }

  getById(id: number): Teacher | undefined {
    return this.teachers().find(t => t.id === id);
  }

  add(data: Omit<Teacher, 'id' | 'avatarColor'>): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/teachers`, data).pipe(
      tap(() => this.loadTeachers())
    );
  }

  update(id: number, data: Partial<Teacher>): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/teachers/${id}`, data).pipe(
      tap(() => this.loadTeachers())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/teachers/${id}`).pipe(
      tap(() => this.loadTeachers())
    );
  }

  getPayrollAmount(teacher: Teacher, studentCount: number): number {
    if (teacher.paymentMode === 'fixed') {
      return teacher.fixedSalary ?? 0;
    }
    return (teacher.ratePerStudent ?? 0) * studentCount;
  }
}
