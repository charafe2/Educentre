import { Injectable, computed, signal } from '@angular/core';

/**
 * Enseignants — the centre's teachers, their pay and their app access.
 * Static for now: rows live in a local signal shaped after Teacher + its
 * User. Wiring means swapping `teachers` for TeachersService and routing
 * access actions through a /teachers/{id}/access endpoint that hashes the
 * password server-side (never through the 'password' default used today).
 */

export type PayMode = 'fixed' | 'per_student';
export type Civility = 'M.' | 'Mme';
export type AccessState = 'active' | 'suspended';

export interface Access {
  login: string;
  state: AccessState;
  /** ISO date of the last password set or reset. */
  passwordSetAt: string;
  lastLoginAt?: string;
}

export interface Teacher {
  id: number;
  civility: Civility;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  subjects: string[];
  mode: PayMode;
  fixedSalary: number;
  ratePerStudent: number;
  /** Distinct students across the teacher's groups (assigned in Groupes). */
  students: number;
  groups: number;
  active: boolean;
  access: Access | null;
}

/** One of the teacher's groups, shaped after GroupRow in groupes-v2. */
export interface TeacherGroup {
  id: number;
  teacherId: number;
  subject: string;
  level: string;
  number: number;
  /** 0 = lundi … 6 = dimanche. */
  days: number[];
  start: string;
  duration: number;
  room: string;
  capacity: number;
  price: number;
  students: number;
}

export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const LEVELS = ['3e année collège', 'Tronc commun', '1re Bac', '2e Bac'];

export const SUBJECTS = [
  'Mathématiques', 'Physique-Chimie', 'SVT', 'Français', 'Anglais', 'Arabe', 'Philosophie', 'Informatique',
];

/** Domain of the demo centre, used to suggest logins. */
export const CENTRE_DOMAIN = 'moujtahid.ma';

const day = (offset: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const TEACHERS: Teacher[] = [
  {
    id: 1, civility: 'M.', firstName: 'Karim', lastName: 'Idrissi', phone: '06 61 23 45 67', email: 'k.idrissi@gmail.com',
    subjects: ['Mathématiques'], mode: 'per_student', fixedSalary: 0, ratePerStudent: 60, students: 0, groups: 0, active: true,
    access: { login: 'karim.idrissi@moujtahid.ma', state: 'active', passwordSetAt: day(60), lastLoginAt: day(0, 9) },
  },
  {
    id: 2, civility: 'M.', firstName: 'Hicham', lastName: 'Ouali', phone: '06 70 11 82 90', email: 'hicham.ouali@outlook.fr',
    subjects: ['Mathématiques'], mode: 'fixed', fixedSalary: 3000, ratePerStudent: 0, students: 0, groups: 0, active: true,
    access: { login: 'hicham.ouali@moujtahid.ma', state: 'active', passwordSetAt: day(41), lastLoginAt: day(2, 18) },
  },
  {
    id: 3, civility: 'Mme', firstName: 'Salma', lastName: 'Benjelloun', phone: '06 62 48 03 15', email: 'salma.benj@gmail.com',
    subjects: ['Physique-Chimie'], mode: 'per_student', fixedSalary: 0, ratePerStudent: 55, students: 0, groups: 0, active: true,
    access: { login: 'salma.benjelloun@moujtahid.ma', state: 'active', passwordSetAt: day(3) },
  },
  {
    id: 4, civility: 'Mme', firstName: 'Nadia', lastName: 'Chraibi', phone: '06 55 90 27 41', email: '',
    subjects: ['SVT'], mode: 'fixed', fixedSalary: 1500, ratePerStudent: 0, students: 0, groups: 0, active: true,
    access: null,
  },
  {
    id: 5, civility: 'Mme', firstName: 'Leila', lastName: 'Alaoui', phone: '06 68 34 70 22', email: 'leila.alaoui@gmail.com',
    subjects: ['Français'], mode: 'per_student', fixedSalary: 0, ratePerStudent: 45, students: 0, groups: 0, active: true,
    access: { login: 'leila.alaoui@moujtahid.ma', state: 'suspended', passwordSetAt: day(120), lastLoginAt: day(35, 20) },
  },
  {
    id: 6, civility: 'M.', firstName: 'Omar', lastName: 'Tazi', phone: '06 77 15 64 38', email: 'omar.tazi@gmail.com',
    subjects: ['Anglais'], mode: 'fixed', fixedSalary: 1200, ratePerStudent: 0, students: 0, groups: 0, active: true,
    access: null,
  },
  {
    id: 7, civility: 'M.', firstName: 'Youssef', lastName: 'Berrada', phone: '06 60 42 19 83', email: 'y.berrada@gmail.com',
    subjects: ['Philosophie', 'Arabe'], mode: 'per_student', fixedSalary: 0, ratePerStudent: 40, students: 0, groups: 0, active: false,
    access: null,
  },
];

/** Same groups as the Groupes page seed, so both pages tell the same story. */
const G = (teacherId: number, subject: string, level: string, number: number, days: string, start: string, room: string, capacity: number, price: number, students: number, duration = 90) =>
  ({ teacherId, subject, level, number, days: days.split(',').map(d => DAY_SHORT.indexOf(d.trim())), start, duration, room, capacity, price, students });

const GROUPS: TeacherGroup[] = [
  G(1, 'Mathématiques', '2e Bac', 1, 'Lun, Mer', '18:00', 'Salle 1', 20, 400, 18),
  G(1, 'Mathématiques', '2e Bac', 2, 'Mar, Jeu', '18:00', 'Salle 1', 20, 400, 20),
  G(3, 'Physique-Chimie', '2e Bac', 1, 'Sam', '10:00', 'Salle 2', 16, 350, 14),
  G(4, 'SVT', '2e Bac', 1, 'Ven', '17:00', 'Salle 3', 16, 300, 9, 120),
  G(2, 'Mathématiques', '1re Bac', 1, 'Lun, Jeu', '17:00', 'Salle 2', 18, 350, 17),
  G(3, 'Physique-Chimie', '1re Bac', 1, 'Mer', '16:00', 'Salle 2', 16, 300, 12),
  G(5, 'Français', '1re Bac', 1, 'Sam', '14:00', 'Salle 1', 20, 250, 20),
  G(2, 'Mathématiques', 'Tronc commun', 1, 'Mar', '17:00', 'Salle 3', 18, 300, 11),
  G(5, 'Français', 'Tronc commun', 1, 'Sam', '16:00', 'Salle 1', 20, 250, 15),
  G(6, 'Anglais', 'Tronc commun', 1, 'Mer', '18:00', 'Salle 3', 15, 250, 6, 60),
  G(1, 'Mathématiques', '3e année collège', 1, 'Sam', '16:00', 'Salle 2', 18, 250, 16),
  G(1, 'Mathématiques', '3e année collège', 2, 'Dim', '10:00', 'Salle 2', 18, 250, 8),
  G(5, 'Français', '3e année collège', 1, 'Mer', '14:00', 'Salle 1', 20, 200, 13),
  G(6, 'Anglais', '3e année collège', 1, 'Sam', '11:00', 'Salle 2', 15, 200, 15, 60),
].map((g, i) => ({ ...g, id: i + 1 }));

@Injectable()
export class EnseignantsStore {
  /** Group and student counts are derived from GROUPS, never typed twice. */
  readonly teachers = signal<Teacher[]>(TEACHERS.map(t => {
    const own = GROUPS.filter(g => g.teacherId === t.id);
    return { ...t, groups: own.length, students: own.reduce((n, g) => n + g.students, 0) };
  }));
  readonly groups = signal<TeacherGroup[]>(GROUPS);
  private seq = TEACHERS.length + 1;

  /** A teacher's groups, by level (collège first) then subject and number. */
  groupsOf(teacherId: number): TeacherGroup[] {
    return this.groups()
      .filter(g => g.teacherId === teacherId)
      .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.subject.localeCompare(b.subject, 'fr') || a.number - b.number);
  }

  readonly active = computed(() => this.teachers().filter(t => t.active));
  readonly payroll = computed(() => this.active().reduce((n, t) => n + salary(t), 0));

  byId(id: number | null): Teacher | undefined {
    return id === null ? undefined : this.teachers().find(t => t.id === id);
  }

  add(t: Omit<Teacher, 'id'>): Teacher {
    const created = { ...t, id: this.seq++ };
    this.teachers.update(list => [created, ...list]);
    return created;
  }

  update(id: number, patch: Partial<Teacher>): void {
    this.teachers.update(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }

  remove(id: number): { teacher: Teacher; index: number } | undefined {
    const index = this.teachers().findIndex(t => t.id === id);
    if (index < 0) return undefined;
    const teacher = this.teachers()[index];
    this.teachers.update(list => list.filter(t => t.id !== id));
    return { teacher, index };
  }

  restore({ teacher, index }: { teacher: Teacher; index: number }): void {
    this.teachers.update(list => [...list.slice(0, index), teacher, ...list.slice(index)]);
  }

  /** Logins are unique across the centre, like users.email. */
  loginTaken(login: string, exceptId?: number): boolean {
    const l = login.trim().toLowerCase();
    return this.teachers().some(t => t.id !== exceptId && t.access?.login.toLowerCase() === l);
  }
}

/** Monthly amount owed: flat, or rate × distinct students. */
export function salary(t: Pick<Teacher, 'mode' | 'fixedSalary' | 'ratePerStudent' | 'students'>): number {
  return t.mode === 'fixed' ? t.fixedSalary : t.ratePerStudent * t.students;
}

export function fullName(t: Pick<Teacher, 'civility' | 'firstName' | 'lastName'>): string {
  return `${t.firstName} ${t.lastName}`.trim();
}

/** "Karim Idrissi" → "karim.idrissi@moujtahid.ma", accents and spaces removed. */
export function suggestLogin(firstName: string, lastName: string): string {
  const slug = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const local = [slug(firstName), slug(lastName)].filter(Boolean).join('.');
  return local ? `${local}@${CENTRE_DOMAIN}` : '';
}

/**
 * 12 characters read aloud or over WhatsApp without mistakes: no 0/O, 1/l/I.
 * Grouped as xxxx-xxxx-xxxx and always mixing lower, upper and digits.
 */
export function generatePassword(): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits;
  const pick = (set: string) => set[randomInt(set.length)];

  for (;;) {
    const chars = Array.from({ length: 12 }, () => pick(all)).join('');
    if (/[a-z]/.test(chars) && /[A-Z]/.test(chars) && /[0-9]/.test(chars)) {
      return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
    }
  }
}

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buf); while (buf[0] >= limit);
  return buf[0] % max;
}

export function money(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
}

/** "Lun, Mer 18:00–19:30" */
export function formatSlot(g: Pick<TeacherGroup, 'days' | 'start' | 'duration'>): string {
  if (!g.days.length) return 'À planifier';
  const [h, m] = g.start.split(':').map(Number);
  const end = h * 60 + m + g.duration;
  const hhmm = `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
  return `${[...g.days].sort().map(d => DAY_SHORT[d]).join(', ')} ${g.start}–${hhmm}`;
}

/** Name as the Groupes page writes it ("M. Idrissi"), for its ?prof= filter. */
export function shortName(t: Pick<Teacher, 'civility' | 'lastName'>): string {
  return `${t.civility} ${t.lastName}`;
}
