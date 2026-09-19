import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from '../models/subject.model';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class SubjectsService {
  private http = inject(HttpClient);

  // Subjects assigned to this tenant by the Super Admin — read-only here.
  subjects = signal<Subject[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<ApiResponse<Subject[]>>(`${environment.apiUrl}/v1/subjects`).subscribe(res => {
      if (res.success) this.subjects.set(res.data);
    });
  }
}
