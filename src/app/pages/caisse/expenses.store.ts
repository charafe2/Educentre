import { Injectable, computed, inject, signal } from '@angular/core';
import { CaisseStore, Method, addMonths, monthIndex } from './caisse.store';

/**
 * Dépenses — teacher salaries and the centre's running costs.
 * Salary maths mirror TeacherPayrollService.buildSalaryRows: a teacher is
 * paid either a fixed monthly amount or a rate × the distinct students
 * enrolled in their classes that month. Static for now: payroll records and
 * expenses live here; wiring means the /teacher-payments endpoints listed in
 * teacher-payroll.service.ts plus an expenses API.
 */

export type PayMode = 'fixed' | 'per_student';

export interface Teacher {
  id: number;
  name: string;
  subjects: string[];
  mode: PayMode;
  fixedSalary?: number;
  ratePerStudent?: number;
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

const TEACHERS: Teacher[] = [
  { id: 1, name: 'M. Idrissi', subjects: ['Mathématiques'], mode: 'per_student', ratePerStudent: 60 },
  { id: 2, name: 'M. Ouali', subjects: ['Mathématiques'], mode: 'fixed', fixedSalary: 3000 },
  { id: 3, name: 'Mme Benjelloun', subjects: ['Physique-Chimie'], mode: 'per_student', ratePerStudent: 55 },
  { id: 4, name: 'Mme Chraibi', subjects: ['SVT'], mode: 'fixed', fixedSalary: 1500 },
  { id: 5, name: 'Mme Alaoui', subjects: ['Français'], mode: 'per_student', ratePerStudent: 45 },
  { id: 6, name: 'M. Tazi', subjects: ['Anglais'], mode: 'fixed', fixedSalary: 1200 },
];

@Injectable()
export class ExpensesStore {
  private caisse = inject(CaisseStore);

  readonly teachers = TEACHERS;
  readonly salaries = signal<SalaryRecord[]>([]);
  readonly expenses = signal<Expense[]>([]);
  private expenseSeq = 1;

  /** Months the tab can show: from the previous school year to now. */
  readonly months = Array.from(
    { length: monthIndex(this.caisse.current) - monthIndex(this.caisse.previousSchoolStart) + 1 },
    (_, i) => addMonths(this.caisse.previousSchoolStart, i),
  );

  constructor() {
    this.seed();
  }

  // ── Salaries ────────────────────────────────────────────────────────
  /** Distinct students taught by `t` in `month`, from the cash desk's enrollments. */
  studentsOf(t: Teacher, month: string): number {
    const i = monthIndex(month);
    return this.caisse.students().filter(s =>
      s.enrollments.some(e => e.teacher === t.name && monthIndex(e.from) <= i && i <= monthIndex(e.to)),
    ).length;
  }

  salaryRows(month: string): SalaryRow[] {
    const records = this.salaries().filter(r => r.month === month);
    return this.teachers
      .map(teacher => {
        const students = this.studentsOf(teacher, month);
        const owed = !students ? 0 : teacher.mode === 'fixed' ? teacher.fixedSalary ?? 0 : (teacher.ratePerStudent ?? 0) * students;
        return { teacher, students, owed, record: records.find(r => r.teacherId === teacher.id) };
      })
      .filter(r => r.owed > 0 || r.record);
  }

  paySalary(row: SalaryRow, month: string, method: Method): void {
    const record: SalaryRecord = { teacherId: row.teacher.id, month, amount: row.owed, method, paidAt: new Date().toISOString() };
    this.salaries.update(list => [...list.filter(r => !(r.teacherId === row.teacher.id && r.month === month)), record]);
  }

  unpaySalary(teacherId: number, month: string): SalaryRecord | undefined {
    const record = this.salaries().find(r => r.teacherId === teacherId && r.month === month);
    this.salaries.update(list => list.filter(r => r !== record));
    return record;
  }

  restoreSalary(record: SalaryRecord): void {
    this.salaries.update(list => [...list, record]);
  }

  // ── Expenses ────────────────────────────────────────────────────────
  expensesOf(month: string): Expense[] {
    return this.expenses().filter(e => e.month === month).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }

  addExpense(e: Omit<Expense, 'id'>): Expense {
    const created = { ...e, id: this.expenseSeq++ };
    this.expenses.update(list => [...list, created]);
    return created;
  }

  removeExpense(id: number): Expense | undefined {
    const found = this.expenses().find(e => e.id === id);
    this.expenses.update(list => list.filter(e => e.id !== id));
    return found;
  }

  restoreExpense(e: Expense): void {
    this.expenses.update(list => [...list, e]);
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

  // ── Demo data ───────────────────────────────────────────────────────
  private seed(): void {
    const today = this.caisse.today;
    const current = this.caisse.current;
    const salaries: SalaryRecord[] = [];
    const expenses: Expense[] = [];

    for (const month of this.months) {
      const [y, m] = month.split('-').map(Number);
      const isCurrent = month === current;
      const at = (day: number, hour = 11) => new Date(y, m - 1, Math.min(day, 28), hour, 0);
      const push = (day: number, category: Category, label: string, amount: number, method: Method, recurring: boolean) => {
        const date = at(day);
        if (date > today) return;
        expenses.push({ id: this.expenseSeq++, month, date: date.toISOString(), category, label, amount, method, recurring });
      };

      // Salaries of month M go out on the last days of M; the current one is still to pay.
      if (!isCurrent) {
        for (const row of this.salaryRows(month)) {
          if (!row.owed) continue;
          salaries.push({ teacherId: row.teacher.id, month, amount: row.owed, method: row.teacher.mode === 'fixed' ? 'Virement' : 'Espèces', paidAt: at(28, 17).toISOString() });
        }
      }

      const summer = m === 7 || m === 8;
      push(5, 'Loyer', 'Loyer du local', 3500, 'Virement', true);
      push(10, 'Internet et téléphone', 'Abonnement fibre', 299, 'Virement', true);
      push(16, 'Électricité et eau', 'Facture Lydec', summer ? 240 : 420 + ((m * 37) % 140), 'Espèces', true);
      if (!summer) push(27, 'Ménage', 'Femme de ménage', 800, 'Espèces', true);
      if (m === 9) push(3, 'Publicité', 'Flyers de la rentrée', 650, 'Espèces', false);
      if (m === 9 || m === 1) push(8, 'Fournitures', 'Feutres, papier, cartouches', 340, 'Espèces', false);
      if (m === 2) push(19, 'Maintenance', 'Réparation climatiseur salle 2', 900, 'Espèces', false);
    }
    this.salaries.set(salaries);
    this.expenses.set(expenses);
  }
}
