import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AnalyticsPeriod, AnalyticsReport } from '../models/analytics.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/v1/analytics/report`;

  getReport(period: AnalyticsPeriod): Observable<ApiResponse<AnalyticsReport>> {
    return this.http.get<ApiResponse<AnalyticsReport>>(this.url, {
      params: new HttpParams().set('period', period),
    });
  }
}
