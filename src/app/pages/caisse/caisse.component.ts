import { Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import {
  CaisseStore, DueLine, METHODS, Method, MonthStatus, Receipt, Student,
  capitalize, money, monthLong, monthShort,
} from './caisse.store';
import { UnpaidTabComponent } from './unpaid-tab.component';
import { StatsTabComponent } from './stats-tab.component';
import { ExpensesTabComponent } from './expenses-tab.component';
import { ExpensesStore } from './expenses.store';

type Tab = 'encaisser' | 'impayes' | 'depenses' | 'statistiques';

const STATUS_LABEL: Record<MonthStatus, string> = {
  paid: 'Payé',
  partial: 'Partiel',
  unpaid: 'Impayé',
  upcoming: 'À venir',
  none: 'Pas de cours',
};

@Component({
  selector: 'app-caisse',
  imports: [FormsModule, AppBarComponent, UnpaidTabComponent, StatsTabComponent, ExpensesTabComponent],
  providers: [CaisseStore, ExpensesStore],
  templateUrl: './caisse.component.html',
  styleUrl: './caisse.component.css',
})
export class CaisseComponent {
  readonly store = inject(CaisseStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly methods = METHODS;
  readonly money = money;
  readonly monthShort = monthShort;
  readonly monthTitle = (m: string) => capitalize(monthLong(m));
  readonly statusLabel = STATUS_LABEL;

  // ── Tabs (in the URL) ─────────────────────────────────────────────
  private params = this.route.snapshot.queryParamMap;
  readonly tab = signal<Tab>((['impayes', 'depenses', 'statistiques'] as Tab[]).find(t => t === this.params.get('onglet')) ?? 'encaisser');
  readonly unpaidCount = computed(() => this.store.unpaid().length);

  // ── Student search ────────────────────────────────────────────────
  readonly query = signal('');
  readonly searchOpen = signal(false);
  readonly cursor = signal(0);
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  readonly matches = computed(() => {
    const q = normalize(this.query().trim());
    if (!q) return [];
    return this.store.students()
      .filter(s => normalize(`${s.name} ${s.code} ${s.parent} ${s.phone.replace(/\s/g, '')}`).includes(q))
      .slice(0, 7);
  });

  readonly recents = signal<number[]>([]);
  readonly recentStudents = computed(() => this.recents().map(id => this.store.student(id)).filter((s): s is Student => !!s));

  /** What the dropdown lists right now: matches, or recents on an empty field. */
  readonly options = computed(() => (this.query().trim() ? this.matches() : this.recentStudents()));

  onQuery(value: string): void {
    this.query.set(value);
    this.cursor.set(0);
    this.searchOpen.set(true);
  }

  onSearchKey(event: KeyboardEvent): void {
    const n = this.options().length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.searchOpen.set(true);
      this.cursor.set(n ? (this.cursor() + 1) % n : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.cursor.set(n ? (this.cursor() - 1 + n) % n : 0);
    } else if (event.key === 'Enter') {
      const pick = this.options()[this.cursor()];
      if (pick) this.selectStudent(pick);
    } else if (event.key === 'Escape') {
      this.searchOpen.set(false);
    }
  }

  // ── Selected student & month ──────────────────────────────────────
  readonly selectedId = signal<number | null>(null);
  readonly student = computed(() => this.store.student(this.selectedId()));
  readonly month = signal<string | null>(null);

  readonly owed = computed(() => {
    const s = this.student();
    return s ? this.store.overdueMonths(s) : [];
  });
  readonly owedTotal = computed(() => this.owed().reduce((n, m) => n + m.rest, 0));
  readonly receipts = computed(() => {
    this.store.payments();
    const s = this.student();
    return s ? this.store.receiptsOf(s.id).slice(0, 8) : [];
  });

  selectStudent(s: Student, month?: string): void {
    this.selectedId.set(s.id);
    this.recents.update(list => [s.id, ...list.filter(id => id !== s.id)].slice(0, 5));
    this.query.set('');
    this.searchOpen.set(false);
    this.searchInput()?.nativeElement.blur();
    this.tab.set('encaisser');
    this.receipt.set(null);
    this.selectMonth(month ?? this.store.suggestedMonth(s));
  }

  clearStudent(): void {
    this.selectedId.set(null);
    this.month.set(null);
    this.receipt.set(null);
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 30);
  }

  statusOf(month: string): MonthStatus {
    this.store.payments();
    const s = this.student();
    return s ? this.store.status(s, month) : 'none';
  }

  cellAmount(month: string): string {
    const s = this.student();
    if (!s) return '';
    const lines = this.store.dueLines(s, month);
    if (!lines.length) return '—';
    const due = lines.reduce((n, l) => n + l.enrollment.price, 0);
    const paid = lines.reduce((n, l) => n + Math.min(l.paid, l.enrollment.price), 0);
    return paid && paid < due ? `${money(paid)}/${money(due)}` : money(due);
  }

  isCurrent(month: string): boolean {
    return month === this.store.current;
  }

  // ── Payment form for the selected month ───────────────────────────
  readonly lines = computed<DueLine[]>(() => {
    this.store.payments();
    const s = this.student();
    const m = this.month();
    return s && m ? this.store.dueLines(s, m) : [];
  });

  /** Amount typed per enrollment; absent = not being paid now. */
  readonly amounts = signal<Record<number, number>>({});
  readonly method = signal<Method>('Espèces');
  readonly receipt = signal<Receipt | null>(null);

  selectMonth(month: string): void {
    this.month.set(month);
    this.receipt.set(null);
    const s = this.student();
    const init: Record<number, number> = {};
    if (s) for (const l of this.store.dueLines(s, month)) if (l.rest > 0) init[l.enrollment.id] = l.rest;
    this.amounts.set(init);
    this.revealPanel();
  }

  /** On one-column layouts the pay panel sits below the months: bring it up. */
  private revealPanel(): void {
    if (typeof window === 'undefined' || window.innerWidth > 860) return;
    setTimeout(() => {
      const panel = this.host.nativeElement.querySelector<HTMLElement>('.pay');
      panel?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }, 80);
  }

  isChecked(id: number): boolean {
    return id in this.amounts();
  }

  toggleLine(line: DueLine): void {
    if (line.rest <= 0) return;
    this.amounts.update(a => {
      const next = { ...a };
      if (line.enrollment.id in next) delete next[line.enrollment.id];
      else next[line.enrollment.id] = line.rest;
      return next;
    });
  }

  setAmount(line: DueLine, value: number | string): void {
    const n = Math.max(0, Math.min(line.rest, Math.round(+value || 0)));
    this.amounts.update(a => ({ ...a, [line.enrollment.id]: n }));
  }

  readonly total = computed(() => Object.values(this.amounts()).reduce((n, v) => n + (+v || 0), 0));
  readonly monthRest = computed(() => this.lines().reduce((n, l) => n + l.rest, 0));
  readonly monthDue = computed(() => this.lines().reduce((n, l) => n + l.enrollment.price, 0));
  readonly isPartial = computed(() => this.total() > 0 && this.total() < this.monthRest());

  pay(): void {
    const s = this.student();
    const m = this.month();
    if (!s || !m || this.total() <= 0) return;
    const chosen = this.lines()
      .filter(l => this.isChecked(l.enrollment.id))
      .map(l => ({ enrollment: l.enrollment, amount: this.amounts()[l.enrollment.id] }));
    const r = this.store.pay(s, m, chosen, this.method());
    this.receipt.set(r);
    this.amounts.set({});
    this.notify(`${money(r.total)} MAD encaissés, reçu ${r.number}`);
  }

  /** After a payment: jump to the next month still owed, if any. */
  readonly nextOwed = computed(() => this.owed().find(o => o.month !== this.month())?.month ?? null);

  printReceipt(r: Receipt): void {
    this.printing.set(r);
    setTimeout(() => window.print(), 50);
  }
  readonly printing = signal<Receipt | null>(null);

  // ── Receipt cancellation ──────────────────────────────────────────
  readonly cancelling = signal<Receipt | null>(null);

  confirmCancel(): void {
    const r = this.cancelling();
    if (!r) return;
    this.store.cancelReceipt(r.number);
    this.cancelling.set(null);
    if (this.receipt()?.number === r.number) this.receipt.set(null);
    if (this.month()) this.selectMonth(this.month()!);
    this.notify(`Reçu ${r.number} annulé`);
  }

  subjectsOf(r: Receipt): string {
    return r.lines.map(l => l.subject).join(', ');
  }

  owedOf(s: Student): number {
    return this.store.overdueMonths(s).reduce((n, o) => n + o.rest, 0);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  // ── From the Impayés tab ──────────────────────────────────────────
  collect(e: { studentId: number; month: string }): void {
    const s = this.store.student(e.studentId);
    if (s) this.selectStudent(s, e.month);
  }

  // ── Snackbar ──────────────────────────────────────────────────────
  readonly snack = signal<{ text: string; id: number; undo?: () => void } | null>(null);
  private snackTimer?: ReturnType<typeof setTimeout>;
  notify(text: string, undo?: () => void): void {
    clearTimeout(this.snackTimer);
    this.snack.set({ text, id: Date.now(), undo });
    this.snackTimer = setTimeout(() => this.snack.set(null), undo ? 6000 : 3500);
  }

  undoSnack(): void {
    const s = this.snack();
    if (!s?.undo) return;
    s.undo();
    this.notify('Action annulée');
  }

  constructor() {
    // Open on a student from the URL (?eleve=EL-1043), e.g. after a reload.
    const code = this.params.get('eleve');
    const fromUrl = code ? this.store.students().find(s => s.code === code) : undefined;
    // Seed "récents" with a few students who owe money: the likely next visitors.
    this.recents.set(this.store.unpaid().slice(0, 3).map(u => u.student.id));
    if (fromUrl) this.selectStudent(fromUrl, this.params.get('mois') ?? undefined);

    effect(() => {
      const queryParams: Record<string, string> = {};
      if (this.tab() !== 'encaisser') queryParams['onglet'] = this.tab();
      const s = this.student();
      if (s && this.tab() === 'encaisser') {
        queryParams['eleve'] = s.code;
        if (this.month()) queryParams['mois'] = this.month()!;
      }
      this.location.replaceState(this.router.createUrlTree([], { relativeTo: this.route, queryParams }).toString());
    });
  }

  // ── Keyboard ──────────────────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.cancelling()) {
      this.cancelling.set(null);
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = !!target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusSearch();
      return;
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey || this.cancelling()) return;
    if (event.key === '/') {
      event.preventDefault();
      this.focusSearch();
    }
  }

  focusSearch(): void {
    this.tab.set('encaisser');
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 30);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement | null)?.closest('.finder')) this.searchOpen.set(false);
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
