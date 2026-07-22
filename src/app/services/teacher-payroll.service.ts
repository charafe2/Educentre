import { Injectable, signal } from '@angular/core';
import { TeacherPayrollRecord, TeacherSalaryRow } from '../models/monthly-review.model';
import { Teacher } from '../models/teacher.model';
import { Classe } from '../models/classe.model';

// TODO(backend): there is no payroll persistence yet (no `teacher_payments` table/API).
// This service is a client-only stand-in so the Monthly Review "Mark as Paid" action
// works end-to-end today. Replace with real HTTP calls once the backend exposes:
//   GET    /api/v1/teacher-payments?month=YYYY-MM
//   POST   /api/v1/teacher-payments/:teacherId/mark-paid   { month, method }
//   DELETE /api/v1/teacher-payments/:teacherId?month=YYYY-MM
// The public method signatures below are written to make that swap a drop-in change.
const STORAGE_KEY = 'moujtahid.teacherPayroll.v1';

@Injectable({ providedIn: 'root' })
export class TeacherPayrollService {
  private records = signal<TeacherPayrollRecord[]>(this.loadFromStorage());

  isPaid(teacherId: number, month: string): boolean {
    return this.records().some(r => r.teacherId === teacherId && r.month === month && r.paid);
  }

  paidAt(teacherId: number, month: string): string | undefined {
    return this.records().find(r => r.teacherId === teacherId && r.month === month)?.paidAt;
  }

  markAsPaid(teacherId: number, month: string, method = 'Virement'): void {
    const now = new Date().toISOString();
    this.records.update(list => {
      const existing = list.find(r => r.teacherId === teacherId && r.month === month);
      if (existing) {
        return list.map(r => r === existing ? { ...r, paid: true, paidAt: now, method } : r);
      }
      return [...list, { teacherId, month, paid: true, paidAt: now, method }];
    });
    this.persist();
  }

  markAsUnpaid(teacherId: number, month: string): void {
    this.records.update(list => list.map(r =>
      r.teacherId === teacherId && r.month === month ? { ...r, paid: false, paidAt: undefined } : r
    ));
    this.persist();
  }

  // Shared math so the Monthly Review salary slide and the AI insights
  // generator always agree on what a teacher is owed this month.
  // - fixed mode  -> the flat monthly salary.
  // - per_student -> rate × number of distinct active students across their classes.
  buildSalaryRows(teachers: Teacher[], classes: Classe[], month: string): TeacherSalaryRow[] {
    return teachers
      .filter(t => t.status === 'active')
      .map(teacher => {
        const studentCount = new Set(
          classes
            .filter(c => c.teacherId === teacher.id)
            .flatMap(c => c.enrolledStudentIds)
        ).size;

        const amountOwed = teacher.paymentMode === 'fixed'
          ? (teacher.fixedSalary ?? 0)
          : (teacher.ratePerStudent ?? 0) * studentCount;

        return {
          teacherId: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          avatarColor: teacher.avatarColor,
          specialty: teacher.specialty,
          amountOwed,
          paid: this.isPaid(teacher.id, month),
          paidAt: this.paidAt(teacher.id, month),
        };
      })
      .filter(row => row.amountOwed > 0);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records()));
    } catch {
      // Storage unavailable (private browsing, quota) — state stays in-memory for this session.
    }
  }

  private loadFromStorage(): TeacherPayrollRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
