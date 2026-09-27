import { Injectable, WritableSignal, computed, signal } from '@angular/core';

/**
 * The centre's teaching set-up, shared by the rebranded pages: the levels and
 * subjects it offers (Paramètres) and its groups (Groupes). Kept in one root
 * store so a level added in Paramètres is offered in Groupes, and so the
 * onboarding can tell a brand-new centre from a running one.
 *
 * Static for now. `?demo=nouveau` on any page starts an empty centre (to walk
 * through the onboarding); `?demo=complet` brings the demo data back. The
 * choice survives reloads.
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

export const LEVELS = ['3e année collège', 'Tronc commun', '1re Bac', '2e Bac'];
export const SUBJECTS = ['Mathématiques', 'Physique-Chimie', 'SVT', 'Français', 'Anglais'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DEFAULT_DURATION = 90;

const FIRST = ['Rania', 'Adam', 'Imane', 'Youssef', 'Salma', 'Mehdi', 'Hiba', 'Omar', 'Aya', 'Anas', 'Nour', 'Ilyas', 'Kenza', 'Hamza', 'Lina', 'Amine', 'Douae', 'Zakaria', 'Malak', 'Reda'];
const LAST = ['El Fassi', 'Berrada', 'Ouazzani', 'Bennani', 'Tahiri', 'Lahlou', 'Kettani', 'Sqalli', 'Benkirane', 'Amrani', 'Chami', 'Naciri', 'Filali', 'Rami', 'Zouiten'];

/** Deterministic pool of distinct names, spread across groups so a student
 *  shows up in two or three groups at most — as in a real centre. */
export const POOL = Array.from({ length: FIRST.length * LAST.length }, (_, i) => (i * 131) % (FIRST.length * LAST.length))
  .map(n => `${FIRST[n % FIRST.length]} ${LAST[Math.floor(n / FIRST.length)]}`);

export function roster(seed: number, count: number): string[] {
  const start = (seed * 23) % POOL.length;
  return Array.from({ length: count }, (_, i) => POOL[(start + i) % POOL.length]);
}

/** "Lun, Mer 18:00" → Slot, for writing the seed by hand. */
export function slot(days: string, start: string, duration = DEFAULT_DURATION): Slot {
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


const DEMO_KEY = 'm-demo-centre';

@Injectable({ providedIn: 'root' })
export class CentreStore {
  private readonly empty = readDemoMode() === 'nouveau';

  readonly levels = signal<string[]>(this.empty ? [] : [...LEVELS]);
  readonly subjects = signal<string[]>(this.empty ? [] : [...SUBJECTS]);
  readonly groups = signal<GroupRow[]>(
    this.empty ? [] : SEED.map(({ size, ...g }, i) => ({ ...g, id: i + 1, students: roster(i + 1, size) })),
  );

  readonly isNew = computed(() => this.groups().length === 0);

  addLevel(name: string): boolean {
    return add(this.levels, name);
  }

  addSubject(name: string): boolean {
    return add(this.subjects, name);
  }

  removeLevel(name: string): number {
    return remove(this.levels, name);
  }

  removeSubject(name: string): number {
    return remove(this.subjects, name);
  }

  restoreLevel(name: string, index: number): void {
    this.levels.update(list => [...list.slice(0, index), name, ...list.slice(index)]);
  }

  restoreSubject(name: string, index: number): void {
    this.subjects.update(list => [...list.slice(0, index), name, ...list.slice(index)]);
  }

  /** Groups still using a level or subject: those can't be removed. */
  usage(kind: 'level' | 'subject', name: string): number {
    return this.groups().filter(g => (kind === 'level' ? g.level : g.subject) === name).length;
  }
}

/** Adds `name` unless it is already there, ignoring case and accents. */
function add(list: WritableSignal<string[]>, name: string): boolean {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean || list().some(x => sameName(x, clean))) return false;
  list.update(l => [...l, clean]);
  return true;
}

function remove(list: WritableSignal<string[]>, name: string): number {
  const index = list().indexOf(name);
  if (index >= 0) list.update(l => l.filter(x => x !== name));
  return index;
}

export function sameName(a: string, b: string): boolean {
  const n = (v: string) => v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  return n(a) === n(b);
}

/** `?demo=` wins and is remembered; otherwise the last choice, else full demo. */
function readDemoMode(): 'nouveau' | 'complet' {
  try {
    const asked = new URLSearchParams(location.search).get('demo');
    if (asked === 'nouveau' || asked === 'complet') {
      localStorage.setItem(DEMO_KEY, asked);
      return asked;
    }
    return localStorage.getItem(DEMO_KEY) === 'nouveau' ? 'nouveau' : 'complet';
  } catch {
    return 'complet';
  }
}
