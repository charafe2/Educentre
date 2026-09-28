import {
  Component, ElementRef, HostListener, afterNextRender, afterRenderEffect, computed, effect, inject,
  signal, viewChild, viewChildren, DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppBarComponent } from '../../layout/app-bar/app-bar.component';
import { OnboardingChecklistComponent } from '../../shared/onboarding/onboarding-checklist.component';
import { CentreStore, DAY_SHORT, DEFAULT_DURATION, GroupRow, Slot, sameName, slotToSessionPayloads } from '../../shared/centre.store';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { SessionsService } from '../../services/sessions.service';
import { TeachersService } from '../../services/teachers.service';
import { RoomsService } from '../../services/rooms.service';
import { StudentsService } from '../../services/students.service';
import { ReceiptCustomizationService } from '../../services/receipt-customization.service';

export type { GroupRow, Slot };

/**
 * Groupes — every group in the centre, wired to the real API. A "group"
 * (GroupRow) is a view built by CentreStore joining a real Group with its
 * Class (subject/level/default teacher/room/price) and its Sessions — a
 * group can override its class's teacher/room/price/schedule (see the
 * Group model's `effectiveTeacherId()` and friends on the backend); when it
 * doesn't, it just shows what the class itself carries.
 */

interface Draft {
  subject: string;
  level: string;
  teacherId: number | null;
  roomId: number | null;
  schedule: Slot;
  capacity: number;
  price: number;
}
type SortKey = 'subject' | 'fill' | 'price' | 'schedule';
type View = 'liste' | 'semaine';

interface Block {
  group: GroupRow;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

const DAY_LONG = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DURATIONS = [60, 120, 180];
const HOUR_PX = 56;

@Component({
  selector: 'app-groupes-v2',
  imports: [FormsModule, RouterLink, AppBarComponent, OnboardingChecklistComponent],
  templateUrl: './groupes-v2.component.html',
  styleUrl: './groupes-v2.component.css',
})
export class GroupesV2Component {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  private centre = inject(CentreStore);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private sessionsService = inject(SessionsService);
  private teachersService = inject(TeachersService);
  private roomsService = inject(RoomsService);
  private studentsService = inject(StudentsService);
  private receiptCustomization = inject(ReceiptCustomizationService);

  /** Offered levels and subjects come from Paramètres. */
  readonly levels = this.centre.levels;
  readonly subjects = this.centre.subjects;
  readonly teachers = this.teachersService.teachers;
  readonly rooms = this.roomsService.rooms;
  readonly dayShort = DAY_SHORT;
  readonly dayLong = DAY_LONG;
  readonly durations = DURATIONS;
  readonly sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'subject', label: 'Trier par matière' },
    { key: 'fill', label: 'Trier par remplissage' },
    { key: 'schedule', label: 'Trier par horaire' },
    { key: 'price', label: 'Trier par tarif' },
  ];

  /** Shared with the other pages (and the onboarding) through CentreStore. */
  readonly groups = this.centre.groups;

  // ── Search, filters, sort, view — mirrored in the URL ─────────────
  private params = this.route.snapshot.queryParamMap;
  readonly query = signal(this.params.get('q') ?? '');
  readonly level = signal<string | null>(this.centre.levels().includes(this.params.get('niveau') ?? '') ? this.params.get('niveau') : null);
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
    const hidden = this.hiddenIds();
    return this.groups()
      .filter(g => !hidden.has(g.id))
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
    return this.levels().map(level => ({
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

  /** Downloads this one group's own weekly schedule as a PDF, to send to its students. */
  async downloadSchedule(g: GroupRow): Promise<void> {
    const rows = [...g.schedule.days].sort().map(d => ({
      day: this.dayLong[d].replace(/^\w/, c => c.toUpperCase()),
      time: `${g.schedule.start}–${endOf(g.schedule)}`,
    }));
    await this.receiptCustomization.downloadGroupSchedule({
      centerName: this.receiptCustomization.settings().centerName,
      subject: g.subject,
      level: g.level,
      groupNumber: g.number,
      teacherName: g.teacher,
      roomName: g.room,
      rows,
      studentCount: g.students.length,
      capacity: g.capacity,
      generatedAt: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
    });
    this.notify(`Emploi du temps téléchargé : ${g.subject}, groupe ${g.number}`);
  }

  // ── Conflicts: same room or same teacher at overlapping times ─────
  /** Every clash in the centre, keyed by group id, as sentences — an ambient view over real data; the actual save() is also validated server-side. */
  readonly conflicts = computed(() => {
    const map = new Map<number, string[]>();
    const list = this.groups();
    for (const g of list) {
      const found = clashes(g.id, g.classeId, g.schedule, g.room, g.teacher, list);
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
  /** Optimistically hidden while a delete's undo window is running. */
  private readonly hiddenIds = signal<Set<number>>(new Set());
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
    return g.capacity ? Math.min(100, Math.round((g.students.length / g.capacity) * 100)) : 0;
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

  // ── Create / edit / duplicate drawer ──────────────────────────────
  readonly editing = signal<GroupRow | 'new' | null>(null);
  draft: Draft = this.blankDraft();
  readonly saving = signal(false);
  private firstField = viewChild<ElementRef<HTMLSelectElement>>('firstField');

  openCreate(): void {
    if (!this.levels().length || !this.subjects().length) {
      this.notify('Ajoutez d’abord vos niveaux et vos matières dans Paramètres');
      return;
    }
    this.draft = this.blankDraft();
    this.editing.set('new');
    this.focusFirstField();
  }

  /** Same subject, level, teacher, room and price; no slot yet — the backend assigns the next free group number. */
  openDuplicate(g: GroupRow): void {
    this.draft = {
      subject: g.subject, level: g.level, teacherId: g.teacherId, roomId: g.roomId,
      schedule: { days: [], start: g.schedule.start || '17:00', duration: g.schedule.duration || DEFAULT_DURATION },
      capacity: g.capacity, price: g.price,
    };
    this.editing.set('new');
    this.focusFirstField();
  }

  openEdit(g: GroupRow): void {
    this.draft = {
      subject: g.subject, level: g.level, teacherId: g.teacherId, roomId: g.roomId,
      schedule: { ...g.schedule, days: [...g.schedule.days] },
      capacity: g.capacity, price: g.price,
    };
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
    const enrolled = target && target !== 'new' ? target.students.length : 0;
    const errors: string[] = [];
    if (!d.subject || !d.level) errors.push('Choisissez une matière et un niveau.');
    if (+d.capacity < Math.max(1, enrolled)) {
      errors.push(enrolled
        ? `Ce groupe compte déjà ${enrolled} élèves : la capacité ne peut pas descendre en dessous.`
        : 'La capacité doit être d’au moins 1 élève.');
    }
    if (!(+d.price >= 0)) errors.push('Le tarif ne peut pas être négatif.');
    return errors;
  }

  /** Non-blocking: clashes with the rest of the timetable, live as you edit — a live preview only; save() is the real, authoritative check. */
  draftConflicts(): string[] {
    const target = this.editing();
    const teacherName = this.teachers().find(t => t.id === this.draft.teacherId);
    const roomName = this.rooms().find(r => r.id === this.draft.roomId);
    const classeId = target && target !== 'new'
      ? target.classeId
      : this.classesService.classes().find(c => sameName(c.subject, this.draft.subject) && sameName(c.level, this.draft.level))?.id ?? null;
    const others = this.groups().filter(g => !(target && target !== 'new' && g.id === target.id));
    return clashes(
      null, classeId, this.draft.schedule,
      roomName?.name ?? '', teacherName ? `${teacherName.firstName} ${teacherName.lastName}` : '',
      others,
    );
  }

  async save(): Promise<void> {
    if (this.draftErrors().length) return;
    const target = this.editing();
    const d = this.draft;
    this.saving.set(true);
    try {
      const overrides = { teacherId: d.teacherId, roomId: d.roomId, monthlyPrice: +d.price };
      let groupId: number;
      let classeId: number;
      let isNew = false;

      if (target && target !== 'new') {
        groupId = target.id;
        classeId = target.classeId;
        await firstValueFrom(this.groupsService.update(groupId, { maxCapacity: +d.capacity, ...overrides }));
      } else {
        isNew = true;
        const existingClass = this.classesService.classes().find(c => sameName(c.subject, d.subject) && sameName(c.level, d.level));
        if (existingClass) {
          classeId = existingClass.id;
          const res = await firstValueFrom(this.groupsService.create(classeId, +d.capacity, overrides));
          groupId = res.data.id;
        } else {
          // New (subject, level) combo: the backend auto-creates a first
          // group for a brand-new class (same as "Ajouter classe") — reuse
          // it rather than leaving an empty, unconfigured group behind.
          const classRes = await firstValueFrom(this.classesService.add({ name: `${d.subject} ${d.level}`, subject: d.subject, level: d.level, status: 'active' }));
          classeId = classRes.data.id;
          const freshGroups = await this.groupsService.loadGroupsAsync();
          const shellGroup = freshGroups.find(g => g.classeId === classeId);
          if (!shellGroup) throw new Error('Groupe créé automatiquement introuvable.');
          await firstValueFrom(this.groupsService.update(shellGroup.id, { maxCapacity: +d.capacity, ...overrides }));
          groupId = shellGroup.id;
        }
      }

      await this.applySchedule(groupId, classeId, d.schedule);
      this.notify(isNew ? `${d.subject}, nouveau groupe créé` : 'Modifications enregistrées');
      this.flash(groupId);
      this.editing.set(null);
    } catch (err) {
      this.notify(extractValidationError(err, 'Conflit d’horaire : vérifiez le créneau, la salle ou l’enseignant.'));
    } finally {
      this.saving.set(false);
    }
  }

  /** Replaces this group's own sessions wholesale with the new slot (there's only ever one slot per group in this UI). */
  private async applySchedule(groupId: number, classeId: number, schedule: Slot): Promise<void> {
    for (const s of this.sessionsService.getByGroup(groupId)) {
      await firstValueFrom(this.sessionsService.delete(s.id));
    }
    for (const payload of slotToSessionPayloads(schedule)) {
      await firstValueFrom(this.sessionsService.add({ classeId, groupId, ...payload, isCancelled: false }));
    }
  }

  private blankDraft(): Draft {
    return {
      subject: this.subject() || this.subjects()[0] || '',
      level: this.level() ?? this.levels()[0] ?? '',
      teacherId: this.teachers()[0]?.id ?? null,
      roomId: this.rooms()[0]?.id ?? null,
      schedule: { days: [], start: '17:00', duration: DEFAULT_DURATION },
      capacity: 18, price: 300,
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

  // ── Delete: confirm, collapse the row, then offer undo before the real call fires ──
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
      this.hiddenIds.update(set => new Set(set).add(g.id));

      let undone = false;
      this.notify(`${g.subject}, groupe ${g.number} supprimé`, true, () => {
        undone = true;
        this.hiddenIds.update(set => {
          const next = new Set(set);
          next.delete(g.id);
          return next;
        });
      }, () => {
        if (undone) return;
        firstValueFrom(this.groupsService.delete(g.id)).catch(() => {
          this.hiddenIds.update(set => {
            const next = new Set(set);
            next.delete(g.id);
            return next;
          });
          this.notify('Impossible de supprimer ce groupe');
        });
      });
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

  private studentIdByNameIn(g: GroupRow, name: string): number | undefined {
    const index = g.students.indexOf(name);
    return index >= 0 ? g.studentIds[index] : undefined;
  }

  move(student: string, from: GroupRow, to: GroupRow): void {
    this.menu.set(null);
    const studentId = this.studentIdByNameIn(from, student);
    if (studentId === undefined) return;
    this.groupsService.moveStudent(studentId, from.id, to.id).subscribe({
      next: () => {
        this.groupsService.loadGroups();
        this.notify(`${student} est maintenant dans le groupe ${to.number}`, true, () => {
          this.groupsService.moveStudent(studentId, to.id, from.id).subscribe(() => this.groupsService.loadGroups());
        });
      },
      error: () => this.notify('Impossible de déplacer cet élève'),
    });
    this.flash(to.id);
  }

  removeStudent(student: string, from: GroupRow): void {
    this.menu.set(null);
    const studentId = this.studentIdByNameIn(from, student);
    if (studentId === undefined) return;
    this.groupsService.removeStudentFromGroup(studentId, from.id).subscribe({
      next: () => this.notify(`${student} n’est plus dans ce groupe`, true, () => {
        this.groupsService.moveStudent(studentId, null, from.id).subscribe(() => this.groupsService.loadGroups());
      }),
      error: () => this.notify('Impossible de retirer cet élève'),
    });
  }

  openPicker(g: GroupRow): void {
    this.pickerQuery.set('');
    this.pickerFor.set(g.id);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLInputElement>('.picker input')?.focus(), 30);
  }

  closePicker(): void {
    this.pickerFor.set(null);
  }

  /** Students already enrolled in this group's class but not yet in any of its groups — same eligibility rule as the v1 Groupes page. */
  candidates(g: GroupRow): { id: number; name: string }[] {
    const q = normalize(this.pickerQuery().trim());
    const groupedElsewhere = new Set(this.groupsService.groups().filter(x => x.classeId === g.classeId).flatMap(x => x.studentIds));
    return this.studentsService.students()
      .filter(s => s.status === 'active' && s.enrolledClassIds.includes(g.classeId) && !groupedElsewhere.has(s.id))
      .map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }))
      .filter(s => !q || normalize(s.name).includes(q))
      .slice(0, 6);
  }

  addStudent(candidate: { id: number; name: string }, g: GroupRow): void {
    this.groupsService.moveStudent(candidate.id, null, g.id).subscribe({
      next: () => {
        this.groupsService.loadGroups();
        this.notify(`${candidate.name} est maintenant dans le groupe ${g.number}`, true, () => {
          this.groupsService.removeStudentFromGroup(candidate.id, g.id).subscribe(() => this.groupsService.loadGroups());
        });
      },
      error: () => this.notify(`Impossible d’ajouter ${candidate.name}`),
    });
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

  // ── Snackbar ──────────────────────────────────────────────────────
  readonly snack = signal<{ text: string; undo: boolean; id: number } | null>(null);
  private snackTimer?: ReturnType<typeof setTimeout>;
  private pendingUndo: (() => void) | null = null;
  private pendingExpire: (() => void) | null = null;

  private notify(text: string, undo = false, onUndo?: () => void, onExpire?: () => void): void {
    clearTimeout(this.snackTimer);
    this.pendingUndo = onUndo ?? null;
    this.pendingExpire = onExpire ?? null;
    this.snack.set({ text, undo, id: Date.now() });
    this.snackTimer = setTimeout(() => {
      this.snack.set(null);
      this.pendingExpire?.();
      this.pendingExpire = null;
    }, undo ? 6000 : 3000);
  }

  undo(): void {
    clearTimeout(this.snackTimer);
    this.pendingExpire = null;
    this.pendingUndo?.();
    this.pendingUndo = null;
    this.snack.set(null);
    this.notify('Action annulée');
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
      const index = this.level() === null ? 0 : this.levels().indexOf(this.level()!) + 1;
      const tab = this.tabs()[index]?.nativeElement;
      const bar = this.indicator()?.nativeElement;
      if (!tab || !bar) return;
      bar.style.width = `${tab.offsetWidth}px`;
      bar.style.transform = `translateX(${tab.offsetLeft}px)`;
    });

    afterNextRender(() => {
      // ?creer=1 (from Paramètres or the onboarding) opens the create panel.
      // The URL effect above already drops the parameter from the address bar.
      if (this.params.get('creer') === '1' && this.levels().length && this.subjects().length) this.openCreate();

      const onResize = () => this.viewport.set(window.innerWidth);
      window.addEventListener('resize', onResize, { passive: true });

      // The "now" rule moves once a minute.
      const tick = setInterval(() => this.clock.update(n => n + 1), 60_000);

      const sentinel = this.sentinel()?.nativeElement;
      const io = sentinel ? new IntersectionObserver(([e]) => this.stuck.set(!e.isIntersecting), { rootMargin: `-${barHeight()}px 0px 0px 0px` }) : null;
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
function clashes(selfId: number | null, classeId: number | null, s: Slot, room: string, teacher: string, others: GroupRow[]): string[] {
  if (!s.days.length) return [];
  const from = toMin(s.start);
  const to = from + +s.duration;
  const out: string[] = [];
  for (const o of others) {
    // Groups of the same class legitimately share its teacher/room/schedule — not a conflict.
    if (o.id === selfId || o.classeId === classeId || !o.schedule.days.length) continue;
    const oFrom = toMin(o.schedule.start);
    const oTo = oFrom + o.schedule.duration;
    const day = s.days.find(d => o.schedule.days.includes(d));
    if (day === undefined || !(from < oTo && oFrom < to)) continue;
    const when = `le ${DAY_LONG[day]} de ${o.schedule.start} à ${endOf(o.schedule)}`;
    const what = `${o.subject}, ${o.level}, groupe ${o.number}`;
    if (room && o.room === room) out.push(`${room} est déjà occupée ${when} (${what}).`);
    if (teacher && o.teacher === teacher) out.push(`${teacher} donne déjà cours ${when} (${what}).`);
  }
  return out;
}

/** The sticky app bar's height (--m-bar-h): the toolbar sticks under it. */
function barHeight(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--m-bar-h')) || 64;
}

function extractValidationError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.status === 422 && err.error?.errors) {
    const messages = Object.values(err.error.errors as Record<string, string[]>).flat();
    return messages.join('. ');
  }
  if (err instanceof HttpErrorResponse && err.error?.message) {
    return err.error.message;
  }
  return fallback;
}
