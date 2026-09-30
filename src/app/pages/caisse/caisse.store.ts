import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StudentsService } from '../../services/students.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { TeachersService } from '../../services/teachers.service';
import { PaymentsService, BatchPaymentLine } from '../../services/payments.service';
import { Payment as RealPayment, PaymentMethod } from '../../models/payment.model';

/**
 * Caisse — real store for the cash desk: students/enrollments/payments are
 * loaded from StudentsService / ClassesService / GroupsService /
 * TeachersService / PaymentsService (all already real, HTTP-backed) and
 * joined here into the view-model shapes the tabs were built against.
 * `pay()`/`cancelReceipt()` go through PaymentsService.payBatch/cancelReceipt.
 */

export type Method = PaymentMethod;
export type MonthStatus = 'paid' | 'partial' | 'unpaid' | 'upcoming' | 'none';

export interface Enrollment {
  /** The class id — a student has at most one active enrollment per class, so this doubles as a stable line key. */
  id: number;
  subject: string;
  group: number;
  teacher: string;
  price: number;
  /** First and (open-ended, far-future) last billed months, 'YYYY-MM'. */
  from: string;
  to: string;
  /** Day of the month they joined on — the recurring due date shown every month, not just the join month. */
  day: number;
}

export interface Student {
  id: number;
  code: string;
  name: string;
  level: string;
  parent: string;
  phone: string;
  enrollments: Enrollment[];
}

export interface Payment {
  id: number;
  studentId: number;
  enrollmentId: number;
  month: string;
  amount: number;
  method: Method;
  paidAt: string;
  receipt: string;
}

export interface DueLine {
  enrollment: Enrollment;
  paid: number;
  rest: number;
}

export interface Receipt {
  number: string;
  student: Student;
  month: string;
  method: Method;
  paidAt: string;
  lines: Array<{ subject: string; group: number; teacher: string; amount: number }>;
  total: number;
}

export const METHODS: Method[] = ['Espèces', 'Virement', 'Chèque'];
/** No-billing-yet placeholder: real distinct levels are read off loaded students instead (see unpaid-tab.component.ts). */
export const LEVELS: string[] = [];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
/** Enrollments are treated as open-ended (billable indefinitely) until this far-future cap. */
const OPEN_ENDED_TO = '2099-12';

// ── Month arithmetic on 'YYYY-MM' ────────────────────────────────────
export function ym(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return ym(d);
}

export function monthIndex(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
}

export function monthLong(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function monthShort(month: string): string {
  return MONTHS_SHORT[+month.split('-')[1] - 1];
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function money(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
}

/** September that opens the school year containing `month`. */
function schoolStart(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${m >= 9 ? y : y - 1}-09`;
}

@Injectable()
export class CaisseStore {
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private teachersService = inject(TeachersService);
  private paymentsService = inject(PaymentsService);

  readonly today = new Date();
  readonly current = ym(this.today);
  readonly currentSchoolStart = schoolStart(this.current);
  readonly previousSchoolStart = addMonths(this.currentSchoolStart, -12);

  /** Real students joined with their billable enrollments (class/group-effective teacher, room, price). */
  readonly students = computed<Student[]>(() => {
    const classes = this.classesService.classes();
    const teachers = this.teachersService.teachers();

    return this.studentsService.students().map(s => {
      const enrollments: Enrollment[] = s.enrollments
        .filter(e => e.status === 'active')
        .flatMap(e => {
          const classe = classes.find(c => c.id === e.classId);
          if (!classe) return [];
          const group = this.groupsService.getGroupForStudent(e.classId, s.id);
          const teacherId = group?.teacherId ?? classe.teacherId;
          const teacherObj = teacherId !== null ? teachers.find(t => t.id === teacherId) : undefined;
          return [{
            id: e.classId,
            subject: classe.subject,
            group: group?.groupNumber ?? 0,
            teacher: teacherObj ? `${teacherObj.firstName} ${teacherObj.lastName}` : (classe.teacherName ?? 'Sans enseignant'),
            price: e.customPrice ?? group?.monthlyPrice ?? classe.monthlyPrice,
            from: e.enrolledAt.slice(0, 7),
            to: OPEN_ENDED_TO,
            day: Number(e.enrolledAt.slice(8, 10)) || 1,
          }];
        });

      return {
        id: s.id,
        code: s.code,
        name: `${s.firstName} ${s.lastName}`,
        level: s.level,
        parent: s.parentName ?? '—',
        phone: s.parentPhone ?? '—',
        enrollments,
      };
    });
  });

  /** Real payments reshaped into this store's line-level view-model (one class = one enrollment line). */
  readonly payments = computed<Payment[]>(() => {
    let seq = 1;
    return this.paymentsService.payments()
      .filter(p => p.amountPaid > 0)
      .map((p: RealPayment): Payment => ({
        id: seq++,
        studentId: p.studentId,
        enrollmentId: p.classeId,
        month: p.periodMonth,
        amount: p.amountPaid,
        method: p.method ?? 'Espèces',
        paidAt: p.paidAt ?? p.periodMonth + '-01',
        receipt: p.receiptNumber ?? `p-${p.id}`,
      }));
  });

  // ── Queries ─────────────────────────────────────────────────────────
  student(id: number | null): Student | undefined {
    return id === null ? undefined : this.students().find(s => s.id === id);
  }

  /** The two school years shown on a student card, 12 months each. */
  schoolYears(): Array<{ label: string; months: string[] }> {
    return [this.previousSchoolStart, this.currentSchoolStart].map(start => ({
      label: `${start.slice(0, 4)}–${+start.slice(0, 4) + 1}`,
      months: Array.from({ length: 12 }, (_, i) => addMonths(start, i)),
    }));
  }

  /** What the student owes for `month`, subject by subject. */
  dueLines(student: Student, month: string): DueLine[] {
    const pays = this.payments().filter(p => p.studentId === student.id && p.month === month);
    return student.enrollments
      .filter(e => monthIndex(e.from) <= monthIndex(month) && monthIndex(month) <= monthIndex(e.to))
      .map(e => {
        const paid = pays.filter(p => p.enrollmentId === e.id).reduce((n, p) => n + p.amount, 0);
        return { enrollment: e, paid, rest: Math.max(0, e.price - paid) };
      });
  }

  status(student: Student, month: string): MonthStatus {
    const lines = this.dueLines(student, month);
    if (!lines.length) return 'none';
    const due = lines.reduce((n, l) => n + l.enrollment.price, 0);
    const paid = lines.reduce((n, l) => n + Math.min(l.paid, l.enrollment.price), 0);
    if (paid >= due) return 'paid';
    if (paid > 0) return 'partial';
    return monthIndex(month) > monthIndex(this.current) ? 'upcoming' : 'unpaid';
  }

  /** Months up to now with money still owed, oldest first. */
  overdueMonths(student: Student): Array<{ month: string; rest: number; status: MonthStatus }> {
    const out: Array<{ month: string; rest: number; status: MonthStatus }> = [];
    for (let m = this.previousSchoolStart; monthIndex(m) <= monthIndex(this.current); m = addMonths(m, 1)) {
      const rest = this.dueLines(student, m).reduce((n, l) => n + l.rest, 0);
      if (rest > 0) out.push({ month: m, rest, status: this.status(student, m) });
    }
    return out;
  }

  /** The month a cashier most likely wants: oldest owed, else the current one. */
  suggestedMonth(student: Student): string {
    return this.overdueMonths(student)[0]?.month ?? this.current;
  }

  receiptsOf(studentId: number): Receipt[] {
    const student = this.student(studentId);
    if (!student) return [];
    const byNumber = new Map<string, Payment[]>();
    for (const p of this.payments().filter(p => p.studentId === studentId)) {
      byNumber.set(p.receipt, [...(byNumber.get(p.receipt) ?? []), p]);
    }
    return [...byNumber.entries()]
      .map(([number, ps]) => this.toReceipt(number, student, ps))
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }

  // ── Everyone who owes money ────────────────────────────────────────
  readonly unpaid = computed(() => {
    return this.students()
      .map(s => {
        const months = this.overdueMonths(s);
        const total = months.reduce((n, m) => n + m.rest, 0);
        const oldest = months[0]?.month;
        const late = oldest ? monthIndex(this.current) - monthIndex(oldest) : 0;
        return { student: s, months, total, oldest, late };
      })
      .filter(r => r.total > 0);
  });

  // ── Statistics ─────────────────────────────────────────────────────
  readonly stats = computed(() => {
    const pays = this.payments();
    const students = this.students();
    const last12 = Array.from({ length: 12 }, (_, i) => addMonths(this.current, i - 11));

    const expectedFor = (month: string) => students.reduce((n, s) =>
      n + s.enrollments.filter(e => monthIndex(e.from) <= monthIndex(month) && monthIndex(month) <= monthIndex(e.to)).reduce((k, e) => k + e.price, 0), 0);
    const collectedFor = (month: string) => pays.filter(p => p.month === month).reduce((n, p) => n + p.amount, 0);

    const series = last12.map(month => ({ month, expected: expectedFor(month), collected: collectedFor(month) }));

    const todayIso = this.today.toISOString().slice(0, 10);
    const today = pays.filter(p => p.paidAt.slice(0, 10) === todayIso);

    const yearMonths = Array.from({ length: monthIndex(this.current) - monthIndex(this.currentSchoolStart) + 1 }, (_, i) => addMonths(this.currentSchoolStart, i));
    const prevYear = Array.from({ length: 12 }, (_, i) => addMonths(this.previousSchoolStart, i));
    const recoveryOf = (months: string[]) => {
      const exp = months.reduce((n, m) => n + expectedFor(m), 0);
      const col = months.reduce((n, m) => n + Math.min(collectedFor(m), expectedFor(m)), 0);
      return exp ? Math.round((col / exp) * 100) : 0;
    };

    // Per subject and per method, over the last 12 months.
    const inWindow = pays.filter(p => last12.includes(p.month));
    const enrollmentSubject = new Map<number, string>();
    for (const s of students) for (const e of s.enrollments) enrollmentSubject.set(e.id, e.subject);
    const bySubject = new Map<string, number>();
    for (const p of inWindow) {
      const subj = enrollmentSubject.get(p.enrollmentId) ?? 'Autre';
      bySubject.set(subj, (bySubject.get(subj) ?? 0) + p.amount);
    }
    const byMethod = METHODS.map(method => ({ method, amount: inWindow.filter(p => p.method === method).reduce((n, p) => n + p.amount, 0) }));
    const windowTotal = inWindow.reduce((n, p) => n + p.amount, 0);

    // Compare with the last month that had classes: July and August have none.
    const thisMonth = series[11];
    const lastMonth = [...series.slice(0, 11)].reverse().find(p => p.expected > 0) ?? series[10];
    return {
      series,
      thisMonth,
      lastMonth,
      delta: lastMonth.collected ? Math.round(((thisMonth.collected - lastMonth.collected) / lastMonth.collected) * 100) : 0,
      todayCount: new Set(today.map(p => p.receipt)).size,
      todayAmount: today.reduce((n, p) => n + p.amount, 0),
      recovery: recoveryOf(yearMonths),
      recoveryPrev: recoveryOf(prevYear),
      bySubject: [...bySubject.entries()].map(([subject, amount]) => ({ subject, amount })).sort((a, b) => b.amount - a.amount),
      byMethod,
      windowTotal,
      max: Math.max(...series.map(s => Math.max(s.expected, s.collected)), 1),
    };
  });

  // ── Writes ─────────────────────────────────────────────────────────
  async pay(student: Student, month: string, lines: Array<{ enrollment: Enrollment; amount: number }>, method: Method): Promise<Receipt> {
    const payload: BatchPaymentLine[] = lines
      .filter(l => l.amount > 0)
      .map(l => ({ classeId: l.enrollment.id, periodMonth: month, amount: l.amount }));

    const res = await firstValueFrom(this.paymentsService.payBatch(student.id, payload, method));
    const paidAt = new Date().toISOString();
    const created: Payment[] = payload.map((l, i) => ({
      id: i, studentId: student.id, enrollmentId: l.classeId, month, amount: l.amount, method, paidAt, receipt: res.data.receiptNumber,
    }));
    return this.toReceipt(res.data.receiptNumber, student, created);
  }

  async cancelReceipt(number: string): Promise<void> {
    await firstValueFrom(this.paymentsService.cancelReceipt(number));
  }

  private toReceipt(number: string, student: Student, ps: Payment[]): Receipt {
    const lines = ps.map(p => {
      const e = student.enrollments.find(x => x.id === p.enrollmentId);
      return { subject: e?.subject ?? '—', group: e?.group ?? 0, teacher: e?.teacher ?? '', amount: p.amount };
    });
    return {
      number, student, month: ps[0]?.month ?? this.current, method: ps[0]?.method ?? 'Espèces', paidAt: ps[0]?.paidAt ?? new Date().toISOString(),
      lines, total: lines.reduce((n, l) => n + l.amount, 0),
    };
  }
}
