import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from '../models/subject.model';
import { environment } from '../../environments/environment';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private http = inject(HttpClient);

  subjects = signal<Subject[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/v1/subjects`).subscribe(res => {
      if (res.success) this.subjects.set(res.data);
    });
  }

  add(data: { name: string; color?: string; bgColor?: string }): Observable<ApiResponse<{ id: number }>> {
    return this.http.post<ApiResponse<{ id: number }>>(`${environment.apiUrl}/v1/subjects`, data).pipe(
      tap(() => this.load())
    );
  }

  update(id: number, data: Partial<Subject>): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/subjects/${id}`, data).pipe(
      tap(() => this.load())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/subjects/${id}`).pipe(
      tap(() => this.load())
    );
  }
}
