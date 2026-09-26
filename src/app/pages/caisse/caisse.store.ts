import { Injectable, computed, signal } from '@angular/core';

/**
 * Caisse — local store for the rebranded cash desk.
 * Static for now: students, enrollments and payments are generated
 * deterministically around today's date, shaped after the real Payment model
 * (one payment = one student × one class × one month). Wiring means loading
 * these from StudentsService / PaymentsService and sending `pay()` and
 * `cancelReceipt()` through PaymentsService.add / delete.
 */

export type Method = 'Espèces' | 'Virement' | 'Chèque';
export type MonthStatus = 'paid' | 'partial' | 'unpaid' | 'upcoming' | 'none';

export interface Enrollment {
  id: number;
  subject: string;
  group: number;
  teacher: string;
  price: number;
  /** First and last billed months, 'YYYY-MM'. */
  from: string;
  to: string;
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
  lines: Array<{ subject: string; group: number; amount: number }>;
  total: number;
}

export const METHODS: Method[] = ['Espèces', 'Virement', 'Chèque'];
export const LEVELS = ['3e année collège', 'Tronc commun', '1re Bac', '2e Bac'];
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

const SUBJECTS: Record<string, Array<{ subject: string; teacher: string; price: number }>> = {
  '3e année collège': [
    { subject: 'Mathématiques', teacher: 'M. Idrissi', price: 250 },
    { subject: 'Français', teacher: 'Mme Alaoui', price: 200 },
    { subject: 'Anglais', teacher: 'M. Tazi', price: 200 },
  ],
  'Tronc commun': [
    { subject: 'Mathématiques', teacher: 'M. Ouali', price: 300 },
    { subject: 'Français', teacher: 'Mme Alaoui', price: 250 },
    { subject: 'Anglais', teacher: 'M. Tazi', price: 250 },
  ],
  '1re Bac': [
    { subject: 'Mathématiques', teacher: 'M. Ouali', price: 350 },
    { subject: 'Physique-Chimie', teacher: 'Mme Benjelloun', price: 300 },
    { subject: 'Français', teacher: 'Mme Alaoui', price: 250 },
  ],
  '2e Bac': [
    { subject: 'Mathématiques', teacher: 'M. Idrissi', price: 400 },
    { subject: 'Physique-Chimie', teacher: 'Mme Benjelloun', price: 350 },
    { subject: 'SVT', teacher: 'Mme Chraibi', price: 300 },
  ],
};

const FIRST = ['Rania', 'Adam', 'Imane', 'Youssef', 'Salma', 'Mehdi', 'Hiba', 'Omar', 'Aya', 'Anas', 'Nour', 'Ilyas', 'Kenza', 'Hamza', 'Lina', 'Amine', 'Douae', 'Zakaria', 'Malak', 'Reda'];
const LAST = ['El Fassi', 'Berrada', 'Ouazzani', 'Bennani', 'Tahiri', 'Lahlou', 'Kettani', 'Sqalli', 'Benkirane', 'Amrani', 'Chami', 'Naciri', 'Filali', 'Rami', 'Zouiten'];
const PARENT_FIRST = ['Karim', 'Nadia', 'Rachid', 'Samira', 'Hassan', 'Latifa', 'Mustapha', 'Fatima', 'Abdelilah', 'Khadija'];

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

/** Small deterministic PRNG so the demo looks the same on every load. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

@Injectable()
export class CaisseStore {
  readonly today = new Date();
  readonly current = ym(this.today);
  readonly currentSchoolStart = schoolStart(this.current);
  readonly previousSchoolStart = addMonths(this.currentSchoolStart, -12);

  readonly students = signal<Student[]>([]);
  readonly payments = signal<Payment[]>([]);
  private receiptSeq = 412;
  private paymentSeq = 1;

  constructor() {
    this.seed();
  }

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
    this.payments();
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
  pay(student: Student, month: string, lines: Array<{ enrollment: Enrollment; amount: number }>, method: Method): Receipt {
    const number = `R-${this.today.getFullYear()}-${String(++this.receiptSeq).padStart(4, '0')}`;
    const paidAt = new Date().toISOString();
    const created: Payment[] = lines
      .filter(l => l.amount > 0)
      .map(l => ({ id: this.paymentSeq++, studentId: student.id, enrollmentId: l.enrollment.id, month, amount: l.amount, method, paidAt, receipt: number }));
    this.payments.update(list => [...list, ...created]);
    return this.toReceipt(number, student, created);
  }

  cancelReceipt(number: string): void {
    this.payments.update(list => list.filter(p => p.receipt !== number));
  }

  private toReceipt(number: string, student: Student, ps: Payment[]): Receipt {
    const lines = ps.map(p => {
      const e = student.enrollments.find(x => x.id === p.enrollmentId)!;
      return { subject: e?.subject ?? '—', group: e?.group ?? 0, amount: p.amount };
    });
    return {
      number, student, month: ps[0]?.month ?? this.current, method: ps[0]?.method ?? 'Espèces', paidAt: ps[0]?.paidAt ?? new Date().toISOString(),
      lines, total: lines.reduce((n, l) => n + l.amount, 0),
    };
  }

  // ── Demo data ──────────────────────────────────────────────────────
  private seed(): void {
    const rand = rng(20260926);
    const students: Student[] = [];
    const payments: Payment[] = [];
    let enrollmentId = 1;
    const used = new Set<string>();
    const lastYearEnd = addMonths(this.currentSchoolStart, -3);   // June
    const thisYearEnd = addMonths(this.currentSchoolStart, 9);    // June

    for (let i = 0; students.length < 42; i++) {
      const name = `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]}`;
      if (used.has(name)) continue;
      used.add(name);
      const level = LEVELS[students.length % LEVELS.length];
      const offer = SUBJECTS[level];
      const count = 1 + Math.floor(rand() * offer.length);
      const picks = [...offer].sort(() => rand() - 0.5).slice(0, count);
      const lateStart = rand() < 0.2 ? Math.floor(rand() * 3) : 0;
      const newThisYear = rand() < 0.2;
      const enrollments: Enrollment[] = [];
      for (const p of picks) {
        const group = 1 + Math.floor(rand() * 2);
        if (!newThisYear) {
          enrollments.push({ id: enrollmentId++, ...p, group, from: addMonths(this.previousSchoolStart, lateStart), to: lastYearEnd });
        }
        enrollments.push({ id: enrollmentId++, ...p, group, from: this.currentSchoolStart, to: thisYearEnd });
      }
      const phone = `06 ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))} ${String(10 + Math.floor(rand() * 89))}`;
      students.push({
        id: students.length + 1,
        code: `EL-${String(1040 + students.length)}`,
        name,
        level,
        parent: `${PARENT_FIRST[Math.floor(rand() * PARENT_FIRST.length)]} ${name.split(' ').slice(1).join(' ')}`,
        phone,
        enrollments,
      });
    }

    // Payment behaviour: a few chronic late payers, most punctual.
    for (const s of students) {
      const reliability = s.id % 7 === 0 ? 0.7 : s.id % 5 === 0 ? 0.85 : 0.985;
      for (let m = this.previousSchoolStart; monthIndex(m) <= monthIndex(this.current) + 1; m = addMonths(m, 1)) {
        const age = monthIndex(this.current) - monthIndex(m);
        const lines = s.enrollments.filter(e => monthIndex(e.from) <= monthIndex(m) && monthIndex(m) <= monthIndex(e.to));
        if (!lines.length) continue;
        const r = rand();
        const payChance = age < 0 ? 0.12 : age === 0 ? reliability - 0.12 : age <= 2 ? reliability - 0.04 : reliability;
        if (r > payChance + 0.04) continue;                 // unpaid
        const partial = r > payChance;                      // paid only in part
        const method: Method = rand() < 0.7 ? 'Espèces' : rand() < 0.66 ? 'Virement' : 'Chèque';
        const [y, mo] = m.split('-').map(Number);
        let day = 1 + Math.floor(rand() * 12);
        const date = age < 0
          ? new Date(this.today.getFullYear(), this.today.getMonth(), Math.max(1, this.today.getDate() - Math.floor(rand() * 5)), 10, 30)
          : new Date(y, mo - 1, day, 9 + Math.floor(rand() * 9), Math.floor(rand() * 60));
        if (date > this.today) {
          day = Math.max(1, this.today.getDate() - Math.floor(rand() * 4));
          date.setDate(day);
          if (date > this.today) date.setTime(this.today.getTime() - 3600_000);
        }
        const receipt = `R-${y}-${String(this.receiptSeq++).padStart(4, '0')}`;
        const chosen = partial ? lines.slice(0, Math.max(1, lines.length - 1)) : lines;
        for (const e of chosen) {
          const amount = partial && chosen.length === 1 ? Math.round(e.price / 2 / 10) * 10 : e.price;
          payments.push({ id: this.paymentSeq++, studentId: s.id, enrollmentId: e.id, month: m, amount, method, paidAt: date.toISOString(), receipt });
        }
      }
    }
    this.students.set(students);
    this.payments.set(payments);
  }
}
