import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { Attendance, AttendanceStatus } from "../models/attendance.model";
import { environment } from "../../environments/environment";
import { ApiResponse } from "../models/api-response.model";

@Injectable({ providedIn: "root" })
export class AttendanceService {
  private http = inject(HttpClient);
  private readonly sessionsUrl = `${environment.apiUrl}/v1/sessions`;

  records = signal<Attendance[]>([]);

  loadBySession(sessionId: number): Observable<ApiResponse<Attendance[]>> {
    return this.http.get<ApiResponse<Attendance[]>>(`${this.sessionsUrl}/${sessionId}/attendance`).pipe(
      tap(res => {
        if (res.success) {
          this.mergeSessionRecords(sessionId, res.data);
        }
      })
    );
  }

  saveForSession(sessionId: number, records: Array<{ studentId: number; status: AttendanceStatus }>): Observable<ApiResponse<Attendance[]>> {
    return this.http.post<ApiResponse<Attendance[]>>(`${this.sessionsUrl}/${sessionId}/attendance`, { records }).pipe(
      tap(res => {
        if (res.success) {
          this.mergeSessionRecords(sessionId, res.data);
        }
      })
    );
  }

  getBySession(sessionId: number): Attendance[] {
    return this.records().filter(r => r.sessionId === sessionId);
  }

  getByStudent(studentId: number): Attendance[] {
    return this.records().filter(r => r.studentId === studentId);
  }

  upsert(record: Omit<Attendance, "id">): void {
    const existing = this.records().find(
      r => r.sessionId === record.sessionId && r.studentId === record.studentId
    );
    if (existing) {
      this.records.update(list => list.map(r =>
        r.id === existing.id ? { ...r, ...record } : r
      ));
    } else {
      const id = this.nextLocalId();
      this.records.update(list => [...list, { ...record, id }]);
    }
  }

  markAttendance(sessionId: number, studentId: number, status: AttendanceStatus): void {
    this.upsert({ sessionId, studentId, status });
  }

  getAttendanceRate(): number {
    const all = this.records();
    if (all.length === 0) return 0;
    const positive = all.filter(r => r.status === "present" || r.status === "late").length;
    return Math.round((positive / all.length) * 100 * 10) / 10;
  }

  getAttendanceRateForSession(sessionId: number): number {
    const session = this.records().filter(r => r.sessionId === sessionId);
    if (session.length === 0) return 0;
    const positive = session.filter(r => r.status === "present" || r.status === "late").length;
    return Math.round((positive / session.length) * 100);
  }

  private mergeSessionRecords(sessionId: number, records: Attendance[]): void {
    this.records.update(list => [
      ...list.filter(r => r.sessionId !== sessionId),
      ...records,
    ]);
  }

  private nextLocalId(): number {
    const maxId = this.records().reduce((max, record) => Math.max(max, record.id), 0);
    return maxId + 1;
  }
}
