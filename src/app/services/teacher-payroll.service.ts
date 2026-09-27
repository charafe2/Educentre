import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { TeacherPayrollRecord, TeacherSalaryRow } from '../models/monthly-review.model';
import { Teacher } from '../models/teacher.model';
import { Classe } from '../models/classe.model';

interface TeacherPaymentApiRow {
  teacherId: number;
  month: string;
  amount: number;
  method: string | null;
  paidAt: string | null;
}

/**
 * Real, backend-persisted (`teacher_payments` table) — every teacher's
 * paid/unpaid status per month is loaded once and kept as a signal so
 * `buildSalaryRows()` (used inside `computed()`s across Monthly Review and
 * the Caisse "Dépenses" tab) stays synchronous and reactive. Writes are
 * applied optimistically (the caller here doesn't subscribe) then
 * reconciled with a reload; a failed write rolls back to the server's
 * actual state.
 */
@Injectable({ providedIn: 'root' })
export class TeacherPayrollService {
  private http = inject(HttpClient);
  private records = signal<TeacherPayrollRecord[]>([]);

  constructor() {
    this.load();
  }

  private load(): void {
    this.http.get<ApiResponse<TeacherPaymentApiRow[]>>(`${environment.apiUrl}/v1/teacher-payments`).subscribe(res => {
      if (res.success) {
        this.records.set(res.data.map(r => ({
          teacherId: r.teacherId,
          month: r.month,
          paid: true,
          paidAt: r.paidAt ?? undefined,
          method: r.method ?? undefined,
        })));
      }
    });
  }

  isPaid(teacherId: number, month: string): boolean {
    return this.records().some(r => r.teacherId === teacherId && r.month === month && r.paid);
  }

  paidAt(teacherId: number, month: string): string | undefined {
    return this.records().find(r => r.teacherId === teacherId && r.month === month)?.paidAt;
  }

  methodOf(teacherId: number, month: string): string | undefined {
    return this.records().find(r => r.teacherId === teacherId && r.month === month)?.method;
  }

  markAsPaid(teacherId: number, month: string, amount: number, method = 'Virement'): void {
    const now = new Date().toISOString();
    this.records.update(list => [
      ...list.filter(r => !(r.teacherId === teacherId && r.month === month)),
      { teacherId, month, paid: true, paidAt: now, method },
    ]);
    this.http.post<ApiResponse<TeacherPaymentApiRow>>(
      `${environment.apiUrl}/v1/teacher-payments/${teacherId}/mark-paid`,
      { month, amount, method },
    ).subscribe({ error: () => this.load() });
  }

  markAsUnpaid(teacherId: number, month: string): void {
    this.records.update(list => list.filter(r => !(r.teacherId === teacherId && r.month === month)));
    this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/teacher-payments/${teacherId}`, {
      params: { month },
    }).subscribe({ error: () => this.load() });
  }

  // Shared math so the Monthly Review salary slide and the Caisse "Dépenses"
  // tab always agree on what a teacher is owed:
  // - fixed mode      -> the flat monthly salary.
  // - per_student     -> rate × number of distinct active students across their classes.
  // - percentage      -> rate × each class's monthlyPrice × that class's own enrollment
  //                      count, summed per class (not deduped): a student in two of the
  //                      teacher's classes pays, and so owes a share of, each class's price.
  buildSalaryRows(teachers: Teacher[], classes: Classe[], month: string): TeacherSalaryRow[] {
    return teachers
      .filter(t => t.status === 'active')
      .map(teacher => {
        const teacherClasses = classes.filter(c => c.teacherId === teacher.id);
        const studentCount = new Set(teacherClasses.flatMap(c => c.enrolledStudentIds)).size;

        const amountOwed = teacher.paymentMode === 'fixed'
          ? (teacher.fixedSalary ?? 0)
          : teacher.paymentMode === 'percentage'
          ? teacherClasses.reduce((sum, c) => sum + c.monthlyPrice * c.enrolledStudentIds.length * ((teacher.percentageRate ?? 0) / 100), 0)
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
          method: this.methodOf(teacher.id, month),
        };
      })
      .filter(row => row.amountOwed > 0);
  }
}
