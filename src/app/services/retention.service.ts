import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { StudentAttritionRiskReport } from '../models/retention-risk.model';

@Injectable({ providedIn: 'root' })
export class RetentionService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/v1/retention/student-risks`;

  getStudentRisks(): Observable<ApiResponse<StudentAttritionRiskReport>> {
    return this.http.get<ApiResponse<StudentAttritionRiskReport>>(this.url);
  }
}
