import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CaisseStore, Method, addMonths, monthIndex } from './caisse.store';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { TeacherPayrollService } from '../../services/teacher-payroll.service';
import { ExpensesService } from '../../services/expenses.service';
import { Expense as RealExpense, ExpenseCategory } from '../../models/expense.model';

/**
 * Dépenses — teacher salaries and the centre's running costs.
 * Salary maths and paid/unpaid persistence are shared with Monthly Review
 * via TeacherPayrollService.buildSalaryRows/markAsPaid/markAsUnpaid (real,
 * `teacher_payments`-backed). Running costs go through ExpensesService
 * (real, `expenses`-backed).
 */

export type PayMode = 'fixed' | 'per_student' | 'percentage';

export interface Teacher {
  id: number;
  name: string;
  subjects: string[];
  mode: PayMode;
  fixedSalary?: number;
  ratePerStudent?: number;
  percentageRate?: number;
}

export interface SalaryRecord {
  teacherId: number;
  month: string;
  amount: number;
  method: Method;
  paidAt: string;
}

export interface SalaryRow {
  teacher: Teacher;
  students: number;
  owed: number;
  record?: SalaryRecord;
}

export const CATEGORIES = [
  'Loyer', 'Électricité et eau', 'Internet et téléphone', 'Ménage', 'Fournitures', 'Publicité', 'Maintenance', 'Autre',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: number;
  month: string;
  date: string;
  category: Category;
  label: string;
  amount: number;
  method: Method;
  /** Comes back every month (rent, internet…): offered for carry-over. */
  recurring: boolean;
}

@Injectable()
export class ExpensesStore {
  private caisse = inject(CaisseStore);
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private payrollService = inject(TeacherPayrollService);
  private expensesService = inject(ExpensesService);

  /** Months the tab can show: from the previous school year to now. */
  readonly months = Array.from(
    { length: monthIndex(this.caisse.current) - monthIndex(this.caisse.previousSchoolStart) + 1 },
    (_, i) => addMonths(this.caisse.previousSchoolStart, i),
  );

  // ── Salaries ────────────────────────────────────────────────────────
  /** Distinct students taught by this teacher, from their currently-assigned classes. */
  private studentCountOf(teacherId: number): number {
    const classes = this.classesService.classes().filter(c => c.teacherId === teacherId);
    return new Set(classes.flatMap(c => c.enrolledStudentIds)).size;
  }

  salaryRows(month: string): SalaryRow[] {
    return this.payrollService
      .buildSalaryRows(this.teachersService.teachers(), this.classesService.classes(), month)
      .map(r => {
        const teacherModel = this.teachersService.getById(r.teacherId);
        const teacher: Teacher = {
          id: r.teacherId,
          name: `${r.firstName} ${r.lastName}`,
          subjects: [r.specialty],
          mode: teacherModel?.paymentMode ?? 'fixed',
          fixedSalary: teacherModel?.fixedSalary,
          ratePerStudent: teacherModel?.ratePerStudent,
          percentageRate: teacherModel?.percentageRate,
        };
        const record: SalaryRecord | undefined = r.paid
          ? { teacherId: r.teacherId, month, amount: r.amountOwed, method: (r.method as Method) ?? 'Virement', paidAt: r.paidAt ?? '' }
          : undefined;
        return { teacher, students: this.studentCountOf(r.teacherId), owed: r.amountOwed, record };
      });
  }

  paySalary(row: SalaryRow, month: string, method: Method): void {
    this.payrollService.markAsPaid(row.teacher.id, month, row.owed, method);
  }

  /** Captures the current record (for undo) before clearing it. */
  unpaySalary(teacherId: number, month: string): SalaryRecord | undefined {
    const record = this.salaryRows(month).find(r => r.teacher.id === teacherId)?.record;
    this.payrollService.markAsUnpaid(teacherId, month);
    return record;
  }

  restoreSalary(record: SalaryRecord): void {
    this.payrollService.markAsPaid(record.teacherId, record.month, record.amount, record.method);
  }

  // ── Expenses ────────────────────────────────────────────────────────
  private toViewModel(e: RealExpense): Expense {
    return {
      id: e.id, month: e.month, date: e.date, category: e.category as Category,
      label: e.label, amount: e.amount, method: (e.method as Method) ?? 'Espèces', recurring: e.recurring,
    };
  }

  expensesOf(month: string): Expense[] {
    return this.expensesService.expenses()
      .filter(e => e.month === month)
      .map(e => this.toViewModel(e))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  async addExpense(e: Omit<Expense, 'id'>): Promise<Expense> {
    const res = await firstValueFrom(this.expensesService.add({
      category: e.category as ExpenseCategory, label: e.label, amount: e.amount, method: e.method, date: e.date, recurring: e.recurring,
    }));
    return this.toViewModel(res.data);
  }

  async removeExpense(id: number): Promise<Expense | undefined> {
    const found = this.expensesService.expenses().find(e => e.id === id);
    if (!found) return undefined;
    await firstValueFrom(this.expensesService.remove(id));
    return this.toViewModel(found);
  }

  async restoreExpense(e: Expense): Promise<void> {
    await this.addExpense(e);
  }

  /** Recurring costs of the month before that are not yet entered for `month`. */
  carryOver(month: string): Expense[] {
    const prev = addMonths(month, -1);
    const here = this.expensesOf(month);
    return this.expensesOf(prev).filter(e => e.recurring && !here.some(h => h.category === e.category && h.label === e.label));
  }

  // ── Month summary ───────────────────────────────────────────────────
  summary(month: string) {
    const rows = this.salaryRows(month);
    const salariesPaid = rows.reduce((n, r) => n + (r.record?.amount ?? 0), 0);
    const salariesDue = rows.filter(r => !r.record).reduce((n, r) => n + r.owed, 0);
    const other = this.expensesOf(month).reduce((n, e) => n + e.amount, 0);
    const collected = this.caisse.payments().filter(p => p.month === month).reduce((n, p) => n + p.amount, 0);
    const byCategory = new Map<string, number>();
    if (salariesPaid) byCategory.set('Salaires', salariesPaid);
    for (const e of this.expensesOf(month)) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    return {
      collected,
      salariesPaid,
      salariesDue,
      other,
      spent: salariesPaid + other,
      result: collected - salariesPaid - other,
      /** What the month will look like once the remaining salaries go out. */
      projected: collected - salariesPaid - salariesDue - other,
      byCategory: [...byCategory.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    };
  }
}
