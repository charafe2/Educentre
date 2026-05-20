import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Student } from '../models/student.model';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private http = inject(HttpClient);

  students = signal<Student[]>([]);

  constructor() {
    this.loadStudents();
  }

  loadStudents(): void {
    this.http.get<ApiResponse<Student[]>>(`${environment.apiUrl}/v1/students`).subscribe(res => {
      if (res.success) {
        this.students.set(res.data);
      }
    });
  }

  getById(id: number): Student | undefined {
    return this.students().find(s => s.id === id);
  }

  add(data: any): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/students`, data).pipe(
      tap(() => this.loadStudents())
    );
  }

  update(id: number, data: Partial<Student>): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/students/${id}`, data).pipe(
      tap(() => this.loadStudents())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/students/${id}`).pipe(
      tap(() => this.loadStudents())
    );
  }

  setPaymentStatus(studentId: number, status: 'paid' | 'pending' | 'overdue'): void {
    this.students.update(list => list.map(s => s.id === studentId ? { ...s, paymentStatus: status } : s));
  }
}
