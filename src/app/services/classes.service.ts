import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Classe } from '../models/classe.model';
import { environment } from '../../environments/environment';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';

const CLASS_COLORS = [
  { color: '#1d4ed8', bgColor: '#dbeafe' },
  { color: '#c2410c', bgColor: '#ffedd5' },
  { color: '#166534', bgColor: '#dcfce7' },
  { color: '#0f766e', bgColor: '#ccfbf1' },
  { color: '#6b21a8', bgColor: '#f3e8ff' },
  { color: '#be185d', bgColor: '#fce7f3' },
  { color: '#1e40af', bgColor: '#e0e7ff' },
  { color: '#92400e', bgColor: '#fef3c7' },
  { color: '#115e59', bgColor: '#ccfbf1' },
  { color: '#7c2d12', bgColor: '#ffedd5' },
];

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private http = inject(HttpClient);

  classes = signal<Classe[]>([]);

  constructor() {
    this.loadClasses();
  }

  loadClasses(): void {
    this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/v1/classes`).subscribe(res => {
      if (res.success) {
        this.classes.set(res.data.map((c, i) => ({
          ...c,
          color: c.color || CLASS_COLORS[i % CLASS_COLORS.length].color,
          bgColor: c.bgColor || CLASS_COLORS[i % CLASS_COLORS.length].bgColor,
        })));
      }
    });
  }

  getById(id: number): Classe | undefined {
    return this.classes().find(c => c.id === id);
  }

  getByIds(ids: number[]): Classe[] {
    return this.classes().filter(c => ids.includes(c.id));
  }

  add(data: any): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/classes`, data).pipe(
      tap(() => this.loadClasses())
    );
  }

  update(id: number, data: Partial<Classe>): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/classes/${id}`, data).pipe(
      tap(() => this.loadClasses())
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/classes/${id}`).pipe(
      tap(() => this.loadClasses())
    );
  }
}
