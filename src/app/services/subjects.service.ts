import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Subject } from '../models/subject.model';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private http = inject(HttpClient);

  // Subjects assigned to this tenant — either by the Super Admin or
  // self-added via add() below.
  subjects = signal<Subject[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/v1/subjects`).subscribe(res => {
      if (res.success) this.subjects.set(res.data);
    });
  }

  add(name: string): Observable<ApiResponse<Subject>> {
    return this.http.post<ApiResponse<Subject>>(`${environment.apiUrl}/v1/subjects`, { name }).pipe(
      tap(() => this.load())
    );
  }

  /** Detaches the subject from this tenant only — the shared catalog entry itself is untouched. */
  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/subjects/${id}`).pipe(
      tap(() => this.load())
    );
  }
}
