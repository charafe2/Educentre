import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { Session } from "../models/session.model";
import { environment } from "../../environments/environment";
import { ApiResponse } from "../models/api-response.model";

@Injectable({ providedIn: "root" })
export class SessionsService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/v1/sessions`;

  sessions = signal<Session[]>([]);

  constructor() {
    this.loadSessions();
  }

  loadSessions(filters: { day?: number; classeId?: number } = {}): void {
    let params = new HttpParams();
    if (filters.day !== undefined) params = params.set("day", filters.day);
    if (filters.classeId !== undefined) params = params.set("classeId", filters.classeId);

    this.http.get<ApiResponse<Session[]>>(this.url, { params }).subscribe(res => {
      if (res.success) {
        this.sessions.set(res.data);
      }
    });
  }

  getByDay(day: number): Session[] {
    return this.sessions().filter(s => s.day === day);
  }

  getByClasse(classeId: number): Session[] {
    return this.sessions().filter(s => s.classeId === classeId);
  }

  getForSlot(day: number, hour: number): Session[] {
    return this.sessions().filter(s => s.day === day && s.startHour === hour);
  }

  add(data: Omit<Session, "id">): Observable<ApiResponse<Session>> {
    return this.http.post<ApiResponse<Session>>(this.url, data).pipe(
      tap(res => {
        if (res.success) {
          this.sessions.update(list => [...list, res.data]);
        }
      })
    );
  }

  update(id: number, data: Partial<Session>): Observable<ApiResponse<Session>> {
    return this.http.put<ApiResponse<Session>>(`${this.url}/${id}`, data).pipe(
      tap(res => {
        if (res.success) {
          this.sessions.update(list => list.map(s => s.id === id ? res.data : s));
        }
      })
    );
  }

  delete(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.url}/${id}`).pipe(
      tap(res => {
        if (res.success) {
          this.sessions.update(list => list.filter(s => s.id !== id));
        }
      })
    );
  }

  cancel(id: number, reason: string): Observable<ApiResponse<Session>> {
    return this.http.post<ApiResponse<Session>>(`${this.url}/${id}/cancel`, { reason }).pipe(
      tap(res => {
        if (res.success) {
          this.sessions.update(list => list.map(s => s.id === id ? res.data : s));
        }
      })
    );
  }
}
