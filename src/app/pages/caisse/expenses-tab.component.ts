import { Component, afterNextRender, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaisseStore, METHODS, Method, capitalize, money, monthLong } from './caisse.store';
import { CATEGORIES, Category, Expense, ExpensesStore, SalaryRecord, SalaryRow } from './expenses.store';

/** Dépenses: teacher salaries and running costs, one month at a time. */
@Component({
  selector: 'app-expenses-tab',
  imports: [FormsModule],
  templateUrl: './expenses-tab.component.html',
  styleUrl: './expenses-tab.component.css',
})
export class ExpensesTabComponent {
  readonly caisse = inject(CaisseStore);
  readonly store = inject(ExpensesStore);
  readonly notify = output<{ text: string; undo?: () => void }>();
  /** Opened from the home shortcut: start on the quick-add form. */
  readonly startAdding = input(false);

  constructor() {
    afterNextRender(() => {
      if (this.startAdding()) this.openAdd();
    });
  }

  readonly money = money;
  readonly Math = Math;
  readonly methods = METHODS;
  readonly categories = CATEGORIES;
  readonly title = (m: string) => capitalize(monthLong(m));

  // ── Month navigation ──────────────────────────────────────────────
  readonly month = signal(this.caisse.current);
  readonly canPrev = computed(() => this.store.months.indexOf(this.month()) > 0);
  readonly canNext = computed(() => this.month() !== this.caisse.current);
  readonly isCurrent = computed(() => this.month() === this.caisse.current);

  step(n: number): void {
    const i = this.store.months.indexOf(this.month()) + n;
    if (i >= 0 && i < this.store.months.length) this.month.set(this.store.months[i]);
    this.paying.set(null);
  }

  // ── Derived views (re-read whenever the stores change) ────────────
  readonly rows = computed(() => {
    this.caisse.students();
    return this.store.salaryRows(this.month());
  });
  readonly expenses = computed(() => this.store.expensesOf(this.month()));
  readonly sum = computed(() => {
    this.caisse.payments();
    return this.store.summary(this.month());
  });
  readonly carry = computed(() => this.store.carryOver(this.month()));
  readonly unpaidRows = computed(() => this.rows().filter(r => !r.record));
  readonly categoryMax = computed(() => Math.max(1, ...this.sum().byCategory.map(c => c.amount)));

  // ── Salaries ──────────────────────────────────────────────────────
  /** Teacher whose payment is being confirmed, with the chosen method. */
  readonly paying = signal<{ teacherId: number; method: Method } | null>(null);

  startPay(row: SalaryRow): void {
    this.paying.set({ teacherId: row.teacher.id, method: row.teacher.mode === 'fixed' ? 'Virement' : 'Espèces' });
  }

  confirmPay(row: SalaryRow): void {
    const p = this.paying();
    if (!p) return;
    this.store.paySalary(row, this.month(), p.method);
    this.paying.set(null);
    const month = this.month();
    this.notify.emit({
      text: `Salaire de ${row.teacher.name} payé : ${money(row.owed)} MAD`,
      undo: () => this.store.unpaySalary(row.teacher.id, month),
    });
  }

  payAll(): void {
    const rows = this.unpaidRows();
    const month = this.month();
    for (const r of rows) this.store.paySalary(r, month, r.teacher.mode === 'fixed' ? 'Virement' : 'Espèces');
    const total = rows.reduce((n, r) => n + r.owed, 0);
    this.notify.emit({
      text: `${rows.length > 1 ? `${rows.length} salaires payés` : '1 salaire payé'} : ${money(total)} MAD`,
      undo: () => rows.forEach(r => this.store.unpaySalary(r.teacher.id, month)),
    });
  }

  cancelPay(row: SalaryRow): void {
    const record = this.store.unpaySalary(row.teacher.id, this.month());
    if (!record) return;
    this.notify.emit({ text: `Paiement de ${row.teacher.name} annulé`, undo: () => this.store.restoreSalary(record as SalaryRecord) });
  }

  modeText(row: SalaryRow): string {
    if (row.teacher.mode === 'fixed') return 'Salaire fixe';
    if (row.teacher.mode === 'percentage') return `${row.teacher.percentageRate}% du tarif, ${row.students} élèves`;
    if (row.teacher.mode === 'per_hour') return `${row.teacher.ratePerHour} MAD × ${row.hours} h/semaine`;
    return `${row.teacher.ratePerStudent} MAD × ${row.students} élèves`;
  }

  // ── Expenses: quick add ───────────────────────────────────────────
  draft = this.blank();
  readonly adding = signal(false);

  private blank(): { category: Category; label: string; amount: number | null; date: string; method: Method; recurring: boolean } {
    return { category: 'Fournitures', label: '', amount: null, date: this.defaultDate(), method: 'Espèces', recurring: false };
  }

  /** Today in the current month; the 1st for a past month. */
  private defaultDate(): string {
    const m = this.month?.() ?? this.caisse.current;
    return m === this.caisse.current ? toDay(this.caisse.today) : `${m}-01`;
  }

  openAdd(): void {
    this.draft = this.blank();
    this.adding.set(true);
    setTimeout(() => document.querySelector<HTMLInputElement>('.add input[name=label]')?.focus(), 40);
  }

  async addExpense(): Promise<void> {
    const d = this.draft;
    const amount = Math.round(+(d.amount ?? 0));
    if (!d.label.trim() || amount <= 0) return;
    const e = await this.store.addExpense({
      month: this.month(), date: new Date(`${d.date}T12:00:00`).toISOString(), category: d.category,
      label: d.label.trim(), amount, method: d.method, recurring: d.recurring,
    });
    this.notify.emit({ text: `Dépense ajoutée : ${e.label}, ${money(e.amount)} MAD`, undo: () => { void this.store.removeExpense(e.id); } });
    this.draft = { ...this.blank(), category: d.category, method: d.method };
    setTimeout(() => document.querySelector<HTMLInputElement>('.add input[name=label]')?.focus(), 20);
  }

  /** Recurring category picked: suggest it as monthly. */
  onCategory(c: Category): void {
    this.draft.category = c;
    this.draft.recurring = ['Loyer', 'Internet et téléphone', 'Électricité et eau', 'Ménage'].includes(c);
  }

  async removeExpense(e: Expense): Promise<void> {
    const removed = await this.store.removeExpense(e.id);
    if (removed) this.notify.emit({ text: `Dépense supprimée : ${removed.label}`, undo: () => { void this.store.restoreExpense(removed); } });
  }

  async carryOverAll(): Promise<void> {
    const items = this.carry();
    const month = this.month();
    const created = await Promise.all(items.map(e => this.store.addExpense({
      ...e, month, date: new Date(`${month}-${e.date.slice(8, 10)}T12:00:00`).toISOString(),
    })));
    this.notify.emit({
      text: `${created.length > 1 ? `${created.length} dépenses fixes reportées` : '1 dépense fixe reportée'} : ${money(created.reduce((n, e) => n + e.amount, 0))} MAD`,
      undo: () => created.forEach(e => { void this.store.removeExpense(e.id); }),
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  initials(name: string): string {
    return name.replace(/^(M\.|Mme)\s+/, '').slice(0, 2).toUpperCase();
  }
}

function toDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
