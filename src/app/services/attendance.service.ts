import { Injectable, signal } from '@angular/core';
import { Attendance, AttendanceStatus } from '../models/attendance.model';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private nextId = signal(16);

  records = signal<Attendance[]>([
    { id: 1, sessionId: 1, studentId: 1, status: 'present' },
    { id: 2, sessionId: 1, studentId: 4, status: 'present' },
    { id: 3, sessionId: 1, studentId: 7, status: 'absent' },
    { id: 4, sessionId: 2, studentId: 1, status: 'present' },
    { id: 5, sessionId: 2, studentId: 2, status: 'late' },
    { id: 6, sessionId: 2, studentId: 4, status: 'present' },
    { id: 7, sessionId: 2, studentId: 7, status: 'present' },
    { id: 8, sessionId: 3, studentId: 2, status: 'present' },
    { id: 9, sessionId: 3, studentId: 6, status: 'present' },
    { id: 10, sessionId: 3, studentId: 8, status: 'excused' },
    { id: 11, sessionId: 5, studentId: 3, status: 'present' },
    { id: 12, sessionId: 5, studentId: 6, status: 'present' },
    { id: 13, sessionId: 7, studentId: 3, status: 'absent' },
    { id: 14, sessionId: 4, studentId: 5, status: 'present' },
    { id: 15, sessionId: 6, studentId: 1, status: 'present' },
  ]);

  getBySession(sessionId: number): Attendance[] {
    return this.records().filter(r => r.sessionId === sessionId);
  }

  getByStudent(studentId: number): Attendance[] {
    return this.records().filter(r => r.studentId === studentId);
  }

  upsert(record: Omit<Attendance, 'id'>): void {
    const existing = this.records().find(
      r => r.sessionId === record.sessionId && r.studentId === record.studentId
    );
    if (existing) {
      this.records.update(list => list.map(r =>
        r.id === existing.id ? { ...r, ...record } : r
      ));
    } else {
      const id = this.nextId();
      this.records.update(list => [...list, { ...record, id }]);
      this.nextId.update(n => n + 1);
    }
  }

  markAttendance(sessionId: number, studentId: number, status: AttendanceStatus): void {
    this.upsert({ sessionId, studentId, status });
  }

  getAttendanceRate(): number {
    const all = this.records();
    if (all.length === 0) return 0;
    const positive = all.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((positive / all.length) * 100 * 10) / 10;
  }

  getAttendanceRateForSession(sessionId: number): number {
    const session = this.records().filter(r => r.sessionId === sessionId);
    if (session.length === 0) return 0;
    const positive = session.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((positive / session.length) * 100);
  }
}
