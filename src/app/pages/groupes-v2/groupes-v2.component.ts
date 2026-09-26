import {
  Component, ElementRef, HostListener, afterNextRender, afterRenderEffect, computed, effect, inject,
  signal, viewChild, viewChildren, DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';

/**
 * Groupes — rebranded list of every group in the centre.
 * Static for now: rows live in a local signal shaped after Classe + Group, so
 * every action works on screen. Wiring means swapping `groups` for
 * ClassesService/GroupsService and routing each write through them.
 */

/** Weekly slot. Days are 0 = lundi … 6 = dimanche; no days = not scheduled. */
export interface Slot {
  days: number[];
  start: string;
  duration: number;
}

export interface GroupRow {
  id: number;
  subject: string;
  level: string;
  number: number;
  teacher: string;
  room: string;
  schedule: Slot;
  capacity: number;
  price: number;
  students: string[];
}

type Draft = Omit<GroupRow, 'id' | 'students'>;
type SortKey = 'subject' | 'fill' | 'price' | 'schedule';
type View = 'liste' | 'semaine';

interface Block {
  group: GroupRow;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

const LEVELS = ['3e année collège', 'Tronc commun', '1re Bac', '2e Bac'];
const SUBJECTS = ['Mathématiques', 'Physique-Chimie', 'SVT', 'Français', 'Anglais'];
const TEACHERS = ['M. Idrissi', 'M. Ouali', 'Mme Benjelloun', 'Mme Chraibi', 'Mme Alaoui', 'M. Tazi'];
const ROOMS = ['Salle 1', 'Salle 2', 'Salle 3'];
const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DURATIONS = [60, 90, 120, 150, 180];
const DEFAULT_DURATION = 90;
const HOUR_PX = 56;

const FIRST = ['Rania', 'Adam', 'Imane', 'Youssef', 'Salma', 'Mehdi', 'Hiba', 'Omar', 'Aya', 'Anas', 'Nour', 'Ilyas', 'Kenza', 'Hamza', 'Lina', 'Amine', 'Douae', 'Zakaria', 'Malak', 'Reda'];
const LAST = ['El Fassi', 'Berrada', 'Ouazzani', 'Bennani', 'Tahiri', 'Lahlou', 'Kettani', 'Sqalli', 'Benkirane', 'Amrani', 'Chami', 'Naciri', 'Filali', 'Rami', 'Zouiten'];

/** Deterministic pool of distinct names, spread across groups so a student
 *  shows up in two or three groups at most — as in a real centre. */
const POOL = Array.from({ length: FIRST.length * LAST.length }, (_, i) => (i * 131) % (FIRST.length * LAST.length))
  .map(n => `${FIRST[n % FIRST.length]} ${LAST[Math.floor(n / FIRST.length)]}`);

function roster(seed: number, count: number): string[] {
  const start = (seed * 23) % POOL.length;
  return Array.from({ length: count }, (_, i) => POOL[(start + i) % POOL.length]);
}

/** "Lun, Mer 18:00" → Slot, for writing the seed by hand. */
function slot(days: string, start: string, duration = DEFAULT_DURATION): Slot {
  return { days: days.split(',').map(d => DAY_SHORT.indexOf(d.trim())), start, duration };
}

// Anglais 3e sits in Salle 2 on Saturday at 11:00 while Physique-Chimie
// 2e Bac runs there until 11:30 — a real-looking clash for the checker.
const SEED: Array<Draft & { size: number }> = [
  { subject: 'Mathématiques', level: '2e Bac', number: 1, teacher: 'M. Idrissi', room: 'Salle 1', schedule: slot('Lun, Mer', '18:00'), capacity: 20, price: 400, size: 18 },
  { subject: 'Mathématiques', level: '2e Bac', number: 2, teacher: 'M. Idrissi', room: 'Salle 1', schedule: slot('Mar, Jeu', '18:00'), capacity: 20, price: 400, size: 20 },
  { subject: 'Physique-Chimie', level: '2e Bac', number: 1, teacher: 'Mme Benjelloun', room: 'Salle 2', schedule: slot('Sam', '10:00'), capacity: 16, price: 350, size: 14 },
  { subject: 'SVT', level: '2e Bac', number: 1, teacher: 'Mme Chraibi', room: 'Salle 3', schedule: slot('Ven', '17:00', 120), capacity: 16, price: 300, size: 9 },
  { subject: 'Mathématiques', level: '1re Bac', number: 1, teacher: 'M. Ouali', room: 'Salle 2', schedule: slot('Lun, Jeu', '17:00'), capacity: 18, price: 350, size: 17 },
  { subject: 'Physique-Chimie', level: '1re Bac', number: 1, teacher: 'Mme Benjelloun', room: 'Salle 2', schedule: slot('Mer', '16:00'), capacity: 16, price: 300, size: 12 },
  { subject: 'Français', level: '1re Bac', number: 1, teacher: 'Mme Alaoui', room: 'Salle 1', schedule: slot('Sam', '14:00'), capacity: 20, price: 250, size: 20 },
  { subject: 'Mathématiques', level: 'Tronc commun', number: 1, teacher: 'M. Ouali', room: 'Salle 3', schedule: slot('Mar', '17:00'), capacity: 18, price: 300, size: 11 },
  { subject: 'Français', level: 'Tronc commun', number: 1, teacher: 'Mme Alaoui', room: 'Salle 1', schedule: slot('Sam', '16:00'), capacity: 20, price: 250, size: 15 },
  { subject: 'Anglais', level: 'Tronc commun', number: 1, teacher: 'M. Tazi', room: 'Salle 3', schedule: slot('Mer', '18:00', 60), capacity: 15, price: 250, size: 6 },
  { subject: 'Mathématiques', level: '3e année collège', number: 1, teacher: 'M. Idrissi', room: 'Salle 2', schedule: slot('Sam', '16:00'), capacity: 18, price: 250, size: 16 },
  { subject: 'Mathématiques', level: '3e année collège', number: 2, teacher: 'M. Idrissi', room: 'Salle 2', schedule: slot('Dim', '10:00'), capacity: 18, price: 250, size: 8 },
  { subject: 'Français', level: '3e année collège', number: 1, teacher: 'Mme Alaoui', room: 'Salle 1', schedule: slot('Mer', '14:00'), capacity: 20, price: 200, size: 13 },
  { subject: 'Anglais', level: '3e année collège', number: 1, teacher: 'M. Tazi', room: 'Salle 2', schedule: slot('Sam', '11:00', 60), capacity: 15, price: 200, size: 15 },
];

@Component({
  selector: 'app-groupes-v2',
  imports: [FormsModule, AppBarComponent],
  templateUrl: './groupes-v2.component.html',
  styleUrl: './groupes-v2.component.css',
})
export class GroupesV2Component {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  readonly levels = LEVELS;
  readonly subjects = SUBJECTS;
  readonly teachers = TEACHERS;
  readonly rooms = ROOMS;
  readonly dayShort = DAY_SHORT;
  readonly dayLong = DAY_LONG;
  readonly durations = DURATIONS;
  readonly sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'subject', label: 'Trier par matière' },
    { key: 'fill', label: 'Trier par remplissage' },
    { key: 'schedule', label: 'Trier par horaire' },
    { key: 'price', label: 'Trier par tarif' },
  ];

  readonly groups = signal<GroupRow[]>(
    SEED.map(({ size, ...g }, i) => ({ ...g, id: i + 1, students: roster(i + 1, size) })),
  );

  // ── Search, filters, sort, view — mirrored in the URL ─────────────
  private params = this.route.snapshot.queryParamMap;
  readonly query = signal(this.params.get('q') ?? '');
  readonly level = signal<string | null>(LEVELS.includes(this.params.get('niveau') ?? '') ? this.params.get('niveau') : null);
  readonly subject = signal(this.params.get('matiere') ?? '');
  readonly teacher = signal(this.params.get('prof') ?? '');
  readonly openOnly = signal(this.params.get('libres') === '1');
  readonly sort = signal<SortKey>((this.sortOptions.find(o => o.key === this.params.get('tri'))?.key) ?? 'subject');
  readonly view = signal<View>(this.params.get('vue') === 'semaine' ? 'semaine' : 'liste');

  readonly hasFilters = computed(() =>
    !!(this.query().trim() || this.level() || this.subject() || this.teacher() || this.openOnly()),
  );

  /** Every group that passes the filters, each with the students the search hit. */
  readonly results = computed(() => {
    const q = normalize(this.query().trim());
    return this.groups()
      .filter(g =>
        (!this.level() || g.level === this.level()) &&
        (!this.subject() || g.subject === this.subject()) &&
        (!this.teacher() || g.teacher === this.teacher()) &&
        (!this.openOnly() || g.students.length < g.capacity))
      .map(g => {
        if (!q) return { group: g, hits: [] as string[] };
        const own = normalize(`${g.subject} ${g.level} groupe ${g.number} g${g.number} ${g.teacher} ${g.room}`);
        const hits = g.students.filter(s => normalize(s).includes(q));
        return own.includes(q) || hits.length ? { group: g, hits } : null;
      })
      .filter((r): r is { group: GroupRow; hits: string[] } => r !== null);
  });

  /** Results bucketed by level, in school order, sorted inside each level. */
  readonly sections = computed(() => {
    const by = this.sort();
    const compare = (a: GroupRow, b: GroupRow): number => {
      if (by === 'fill') return this.fill(b) - this.fill(a);
      if (by === 'price') return b.price - a.price;
      if (by === 'schedule') return scheduleKey(a.schedule) - scheduleKey(b.schedule);
      return a.subject.localeCompare(b.subject) || a.number - b.number;
    };
    return LEVELS.map(level => ({
      level,
      rows: this.results().filter(r => r.group.level === level).sort((a, b) => compare(a.group, b.group)),
    })).filter(s => s.rows.length > 0);
  });

  readonly totalStudents = computed(() => this.groups().reduce((n, g) => n + g.students.length, 0));
  readonly openSeats = computed(() => this.groups().reduce((n, g) => n + Math.max(0, g.capacity - g.students.length), 0));
  readonly shownCount = computed(() => this.results().length);

  levelCount(level: string | null): number {
    return level ? this.groups().filter(g => g.level === level).length : this.groups().length;
  }

  clearFilters(): void {
    this.query.set('');
    this.level.set(null);
    this.subject.set('');
    this.teacher.set('');
    this.openOnly.set(false);
  }

  // ── Schedule helpers ──────────────────────────────────────────────
  formatSlot(s: Slot): string {
    if (!s.days.length) return 'À planifier';
    return `${[...s.days].sort().map(d => DAY_SHORT[d]).join(', ')} ${s.start}–${endOf(s)}`;
  }

  formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} h ${m}` : `${h} h`;
  }

  // ── Conflicts: same room or same teacher at overlapping times ─────
  /** Every clash in the centre, keyed by group id, as sentences. */
  readonly conflicts = computed(() => {
    const map = new Map<number, string[]>();
    const list = this.groups();
    for (const g of list) {
      const found = clashes(g, g.schedule, g.room, g.teacher, list);
      if (found.length) map.set(g.id, found);
    }
    return map;
  });

  conflictsOf(id: number): string[] {
    return this.conflicts().get(id) ?? [];
  }

  readonly conflictCount = computed(() => this.conflicts().size);

  // ── Rows ──────────────────────────────────────────────────────────
  readonly expanded = signal<Set<number>>(new Set());
  readonly removing = signal<number | null>(null);

  isExpanded(id: number): boolean {
    return this.expanded().has(id);
  }

  toggle(id: number): void {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  isFull(g: GroupRow): boolean {
    return g.students.length >= g.capacity;
  }

  fill(g: GroupRow): number {
    return Math.min(100, Math.round((g.students.length / g.capacity) * 100));
  }

  money(value: number): string {
    return value.toLocaleString('fr-FR').replace(/\s/g, ' ');
  }

  /** Other groups teaching the same subject at the same level. */
  siblings(g: GroupRow): GroupRow[] {
    return this.groups()
      .filter(x => x.id !== g.id && x.subject === g.subject && x.level === g.level)
      .sort((a, b) => a.number - b.number);
  }

  private nextNumber(subject: string, level: string): number {
    return Math.max(0, ...this.groups().filter(g => g.subject === subject && g.level === level).map(g => g.number)) + 1;
  }

  // ── Create / edit / duplicate drawer ──────────────────────────────
  readonly editing = signal<GroupRow | 'new' | null>(null);
  draft: Draft = this.blankDraft();
  private firstField = viewChild<ElementRef<HTMLSelectElement>>('firstField');

  openCreate(): void {
    this.draft = this.blankDraft();
    this.editing.set('new');
    this.focusFirstField();
  }

  /** Same subject, level, teacher and price; next free number; no slot yet. */
  openDuplicate(g: GroupRow): void {
    const { id, students, ...rest } = g;
    this.draft = { ...rest, number: this.nextNumber(g.subject, g.level), schedule: { days: [], start: g.schedule.start, duration: g.schedule.duration } };
    this.editing.set('new');
    this.focusFirstField();
  }

  openEdit(g: GroupRow): void {
    const { id, students, ...rest } = g;
    this.draft = { ...rest, schedule: { ...g.schedule, days: [...g.schedule.days] } };
    this.editing.set(g);
    this.focusFirstField();
  }

  closeDrawer(): void {
    this.editing.set(null);
  }

  toggleDay(day: number): void {
    const days = this.draft.schedule.days;
    this.draft.schedule.days = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
  }

  /** Blocking problems: the form cannot be saved while any remain. */
  draftErrors(): string[] {
    const d = this.draft;
    const target = this.editing();
    const selfId = target && target !== 'new' ? target.id : null;
    const errors: string[] = [];
    if (this.groups().some(g => g.id !== selfId && g.subject === d.subject && g.level === d.level && g.number === +d.number)) {
      errors.push(`Le groupe ${d.number} existe déjà en ${d.subject}, ${d.level}.`);
    }
    if (!(+d.number >= 1)) errors.push('Le numéro de groupe doit être 1 ou plus.');
    const enrolled = target && target !== 'new' ? target.students.length : 0;
    if (+d.capacity < Math.max(1, enrolled)) {
      errors.push(enrolled
        ? `Ce groupe compte déjà ${enrolled} élèves : la capacité ne peut pas descendre en dessous.`
        : 'La capacité doit être d’au moins 1 élève.');
    }
    if (!(+d.price >= 0)) errors.push('Le tarif ne peut pas être négatif.');
    return errors;
  }

  /** Non-blocking: clashes with the rest of the timetable, live as you edit. */
  draftConflicts(): string[] {
    const target = this.editing();
    const others = this.groups().filter(g => !(target && target !== 'new' && g.id === target.id));
    return clashes(null, this.draft.schedule, this.draft.room, this.draft.teacher, others);
  }

  save(): void {
    if (this.draftErrors().length) return;
    const target = this.editing();
    const d = this.draft;
    const draft: Draft = { ...d, number: +d.number, capacity: +d.capacity, price: +d.price, schedule: { ...d.schedule, duration: +d.schedule.duration } };
    if (target === 'new') {
      const id = Math.max(0, ...this.groups().map(g => g.id)) + 1;
      this.commit(list => [...list, { ...draft, id, students: [] }], `${draft.subject}, groupe ${draft.number} créé`);
      this.flash(id);
    } else if (target) {
      this.commit(list => list.map(g => (g.id === target.id ? { ...g, ...draft } : g)), 'Modifications enregistrées');
      this.flash(target.id);
    }
    this.editing.set(null);
  }

  private blankDraft(): Draft {
    const level = this.level() ?? LEVELS[0];
    const subject = this.subject() || SUBJECTS[0];
    return {
      subject, level, number: this.nextNumber(subject, level), teacher: this.teacher() || TEACHERS[0], room: ROOMS[0],
      schedule: { days: [], start: '17:00', duration: DEFAULT_DURATION }, capacity: 18, price: 300,
    };
  }

  private focusFirstField(): void {
    setTimeout(() => this.firstField()?.nativeElement.focus(), 60);
  }

  /** Briefly marks a row that just changed so the eye finds it. */
  readonly flashed = signal<number | null>(null);
  private flash(id: number): void {
    this.flashed.set(id);
    setTimeout(() => this.flashed.set(null), 1400);
  }

  // ── Delete: confirm, collapse the row, then offer undo ────────────
  readonly confirming = signal<GroupRow | null>(null);

  askDelete(g: GroupRow): void {
    this.confirming.set(g);
  }

  confirmDelete(): void {
    const g = this.confirming();
    if (!g) return;
    this.confirming.set(null);

    // Pin the row's current height so the collapse animates from it.
    const el = document.getElementById(`row-${g.id}`);
    if (el) el.style.setProperty('--row-h', `${el.offsetHeight}px`);
    this.removing.set(g.id);

    setTimeout(() => {
      this.removing.set(null);
      this.commit(list => list.filter(x => x.id !== g.id), `${g.subject}, groupe ${g.number} supprimé`, true);
    }, 260);
  }

  // ── Students: add, move, remove ───────────────────────────────────
  readonly menu = signal<{ groupId: number; student: string } | null>(null);
  readonly pickerFor = signal<number | null>(null);
  readonly pickerQuery = signal('');

  toggleMenu(groupId: number, student: string): void {
    const m = this.menu();
    this.menu.set(m && m.groupId === groupId && m.student === student ? null : { groupId, student });
  }

  isMenuOpen(groupId: number, student: string): boolean {
    const m = this.menu();
    return !!m && m.groupId === groupId && m.student === student;
  }

  move(student: string, from: GroupRow, to: GroupRow): void {
    this.menu.set(null);
    this.commit(
      list => list.map(g =>
        g.id === from.id ? { ...g, students: g.students.filter(s => s !== student) }
        : g.id === to.id ? { ...g, students: [...g.students, student] }
        : g),
      `${student} est maintenant dans le groupe ${to.number}`,
      true,
    );
    this.flash(to.id);
  }

  removeStudent(student: string, from: GroupRow): void {
    this.menu.set(null);
    this.commit(
      list => list.map(g => (g.id === from.id ? { ...g, students: g.students.filter(s => s !== student) } : g)),
      `${student} n’est plus dans ce groupe`,
      true,
    );
  }

  openPicker(g: GroupRow): void {
    this.pickerQuery.set('');
    this.pickerFor.set(g.id);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.picker input')?.focus(), 30);
  }

  closePicker(): void {
    this.pickerFor.set(null);
  }

  /** Students of the centre not yet in this group, best matches first. */
  candidates(g: GroupRow): string[] {
    const q = normalize(this.pickerQuery().trim());
    return POOL
      .filter(s => !g.students.includes(s) && (!q || normalize(s).includes(q)))
      .slice(0, 6);
  }

  addStudent(student: string, g: GroupRow): void {
    this.commit(
      list => list.map(x => (x.id === g.id ? { ...x, students: [...x.students, student] } : x)),
      `${student} est maintenant dans le groupe ${g.number}`,
      true,
    );
    this.pickerQuery.set('');
    if (g.students.length + 1 >= g.capacity) this.closePicker();
  }

  // ── Week view ─────────────────────────────────────────────────────
  readonly today = (new Date().getDay() + 6) % 7;
  readonly focusDay = signal(this.today);

  /** Hour range that fits every shown slot, never narrower than 9h–20h. */
  readonly hours = computed(() => {
    const slots = this.results().map(r => r.group.schedule).filter(s => s.days.length);
    const from = Math.min(9, ...slots.map(s => Math.floor(toMin(s.start) / 60)));
    const to = Math.max(20, ...slots.map(s => Math.ceil((toMin(s.start) + s.duration) / 60)));
    return Array.from({ length: to - from }, (_, i) => from + i);
  });

  readonly gridHeight = computed(() => this.hours().length * HOUR_PX);

  /** Blocks per day, laid out in side-by-side lanes where they overlap. */
  readonly week = computed(() => {
    const origin = this.hours()[0] * 60;
    const shown = this.results().map(r => r.group).filter(g => g.schedule.days.length);
    return DAY_SHORT.map((_, day) => {
      const items = shown
        .filter(g => g.schedule.days.includes(day))
        .map(g => ({ group: g, from: toMin(g.schedule.start), to: toMin(g.schedule.start) + g.schedule.duration }))
        .sort((a, b) => a.from - b.from || a.to - b.to);

      const blocks: Block[] = [];
      let cluster: Array<(typeof items)[number] & { lane: number }> = [];
      let clusterEnd = -1;
      const flush = () => {
        const lanes = Math.max(1, ...cluster.map(c => c.lane + 1));
        for (const c of cluster) {
          blocks.push({ group: c.group, top: ((c.from - origin) / 60) * HOUR_PX, height: ((c.to - c.from) / 60) * HOUR_PX, lane: c.lane, lanes });
        }
        cluster = [];
      };
      for (const it of items) {
        if (it.from >= clusterEnd && cluster.length) flush();
        const busy = new Set(cluster.filter(c => c.to > it.from).map(c => c.lane));
        let lane = 0;
        while (busy.has(lane)) lane++;
        cluster.push({ ...it, lane });
        clusterEnd = Math.max(clusterEnd, it.to);
      }
      if (cluster.length) flush();
      return { day, blocks, count: items.length };
    });
  });

  readonly unscheduled = computed(() => this.results().map(r => r.group).filter(g => !g.schedule.days.length));

  /** The "now" rule in today's column; null outside the visible hours. */
  readonly nowTop = computed(() => {
    this.clock();
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() - this.hours()[0] * 60;
    return mins >= 0 && mins <= this.hours().length * 60 ? (mins / 60) * HOUR_PX : null;
  });

  readonly nowLabel = computed(() => {
    this.clock();
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
  });

  private clock = signal(0);

  // ── Export ────────────────────────────────────────────────────────
  exportCsv(): void {
    const rows = this.sections().flatMap(s => s.rows.map(r => r.group));
    const head = ['Niveau', 'Matière', 'Groupe', 'Enseignant', 'Horaire', 'Salle', 'Élèves', 'Capacité', 'Tarif mensuel (MAD)'];
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [head, ...rows.map(g => [g.level, g.subject, g.number, g.teacher, this.formatSlot(g.schedule), g.room, g.students.length, g.capacity, g.price])]
      .map(r => r.map(cell).join(';'));
    // BOM + semicolons: opens with accents and columns intact in French Excel.
    const bom = String.fromCharCode(0xfeff);
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `groupes-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
    this.notify(`Export téléchargé : ${rows.length} ${rows.length > 1 ? 'groupes' : 'groupe'}`);
  }

  // ── Undoable writes & snackbar ────────────────────────────────────
  readonly snack = signal<{ text: string; undo: boolean; id: number } | null>(null);
  private snackTimer?: ReturnType<typeof setTimeout>;
  private undoSnapshot: GroupRow[] | null = null;

  /** Applies a change; when `undoable`, keeps the previous list for "Annuler". */
  private commit(change: (list: GroupRow[]) => GroupRow[], message: string, undoable = false): void {
    this.undoSnapshot = undoable ? this.groups() : null;
    this.groups.update(change);
    this.notify(message, undoable);
  }

  undo(): void {
    if (!this.undoSnapshot) return;
    this.groups.set(this.undoSnapshot);
    this.undoSnapshot = null;
    this.notify('Action annulée');
  }

  private notify(text: string, undo = false): void {
    clearTimeout(this.snackTimer);
    this.snack.set({ text, undo, id: Date.now() });
    this.snackTimer = setTimeout(() => this.snack.set(null), undo ? 6000 : 3000);
  }

  // ── Toolbar: sticky state and the sliding level indicator ─────────
  readonly stuck = signal(false);
  private sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private toolbar = viewChild<ElementRef<HTMLElement>>('toolbar');
  private tabs = viewChildren<ElementRef<HTMLElement>>('tab');
  private indicator = viewChild<ElementRef<HTMLElement>>('indicator');
  private viewport = signal(0);

  constructor() {
    // Keep the URL in step with the filters, without a router navigation
    // (which would replay the page transition on every keystroke).
    effect(() => {
      const queryParams: Record<string, string> = {};
      if (this.view() === 'semaine') queryParams['vue'] = 'semaine';
      if (this.query().trim()) queryParams['q'] = this.query().trim();
      if (this.level()) queryParams['niveau'] = this.level()!;
      if (this.subject()) queryParams['matiere'] = this.subject();
      if (this.teacher()) queryParams['prof'] = this.teacher();
      if (this.openOnly()) queryParams['libres'] = '1';
      if (this.sort() !== 'subject') queryParams['tri'] = this.sort();
      this.location.replaceState(this.router.createUrlTree([], { relativeTo: this.route, queryParams }).toString());
    });

    afterRenderEffect(() => {
      this.viewport();
      const index = this.level() === null ? 0 : LEVELS.indexOf(this.level()!) + 1;
      const tab = this.tabs()[index]?.nativeElement;
      const bar = this.indicator()?.nativeElement;
      if (!tab || !bar) return;
      bar.style.width = `${tab.offsetWidth}px`;
      bar.style.transform = `translateX(${tab.offsetLeft}px)`;
    });

    afterNextRender(() => {
      const onResize = () => this.viewport.set(window.innerWidth);
      window.addEventListener('resize', onResize, { passive: true });

      // The "now" rule moves once a minute.
      const tick = setInterval(() => this.clock.update(n => n + 1), 60_000);

      const sentinel = this.sentinel()?.nativeElement;
      const io = sentinel ? new IntersectionObserver(([e]) => this.stuck.set(!e.isIntersecting)) : null;
      if (sentinel) io!.observe(sentinel);

      const bar = this.toolbar()?.nativeElement;
      const ro = bar ? new ResizeObserver(() => this.host.nativeElement.style.setProperty('--toolbar-h', `${bar.offsetHeight}px`)) : null;
      if (bar) ro!.observe(bar);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', onResize);
        clearInterval(tick);
        io?.disconnect();
        ro?.disconnect();
      });
    });
  }

  // ── Keyboard & outside clicks ─────────────────────────────────────
  private search = viewChild<ElementRef<HTMLInputElement>>('search');

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.confirming()) this.confirming.set(null);
      else if (this.editing()) this.closeDrawer();
      else if (this.menu()) this.menu.set(null);
      else if (this.pickerFor() !== null) this.closePicker();
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    const overlay = !!(this.editing() || this.confirming());
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.search()?.nativeElement.focus();
      return;
    }
    if (typing || overlay || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === '/') {
      event.preventDefault();
      this.search()?.nativeElement.focus();
    } else if (event.key === 'n') {
      event.preventDefault();
      this.openCreate();
    } else if (event.key === 'l' || event.key === 's') {
      this.view.set(event.key === 's' ? 'semaine' : 'liste');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.menu() && !target?.closest('.chip-wrap')) this.menu.set(null);
  }
}

/** Case- and accent-insensitive matching: "eleve" finds "Élève". */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function endOf(s: Slot): string {
  const t = toMin(s.start) + +s.duration;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Orders by first day, then start time; unscheduled groups last. */
function scheduleKey(s: Slot): number {
  return s.days.length ? Math.min(...s.days) * 10000 + toMin(s.start) : 99999;
}

/**
 * Sentences describing every clash between `slot` (held in `room` by
 * `teacher`) and the groups in `others`. `self` is skipped when given.
 */
function clashes(self: GroupRow | null, s: Slot, room: string, teacher: string, others: GroupRow[]): string[] {
  if (!s.days.length) return [];
  const from = toMin(s.start);
  const to = from + +s.duration;
  const out: string[] = [];
  for (const o of others) {
    if (o === self || !o.schedule.days.length) continue;
    const oFrom = toMin(o.schedule.start);
    const oTo = oFrom + o.schedule.duration;
    const day = s.days.find(d => o.schedule.days.includes(d));
    if (day === undefined || !(from < oTo && oFrom < to)) continue;
    const when = `le ${DAY_LONG[day]} de ${o.schedule.start} à ${endOf(o.schedule)}`;
    const what = `${o.subject}, ${o.level}, groupe ${o.number}`;
    if (o.room === room) out.push(`${room} est déjà occupée ${when} (${what}).`);
    if (o.teacher === teacher) out.push(`${teacher} donne déjà cours ${when} (${what}).`);
  }
  return out;
}
