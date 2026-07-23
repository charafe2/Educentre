import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AcademicLevel } from '../models/academic-level.model';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AcademicLevelsService {
  private http = inject(HttpClient);

  // Academic levels assigned to this tenant by the Super Admin — read-only here.
  levels = signal<AcademicLevel[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<ApiResponse<AcademicLevel[]>>(`${environment.apiUrl}/v1/academic-levels`).subscribe(res => {
      if (res.success) this.levels.set(res.data);
    });
  }
}
