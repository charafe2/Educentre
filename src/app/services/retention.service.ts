import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, PaginatedMeta } from '../models/api-response.model';
import { StudentAttritionRiskReport } from '../models/retention-risk.model';

export interface StudentAttritionRiskResponse extends ApiResponse<StudentAttritionRiskReport> {
  meta: PaginatedMeta;
}

@Injectable({ providedIn: 'root' })
export class RetentionService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/v1/retention/student-risks`;

  getStudentRisks(page = 1, perPage = 8): Observable<StudentAttritionRiskResponse> {
    return this.http.get<StudentAttritionRiskResponse>(this.url, {
      params: {
        page,
        per_page: perPage,
      },
    });
  }
}
