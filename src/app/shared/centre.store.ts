import { Injectable, computed, inject } from '@angular/core';
import { AcademicLevelsService } from '../services/academic-levels.service';
import { SubjectsService } from '../services/subjects.service';
import { ClassesService } from '../services/classes.service';
import { GroupsService } from '../services/groups.service';
import { SessionsService } from '../services/sessions.service';
import { TeachersService } from '../services/teachers.service';
import { RoomsService } from '../services/rooms.service';
import { StudentsService } from '../services/students.service';
import { Session } from '../models/session.model';

/**
 * The centre's teaching set-up, shared by the rebranded pages: the levels
 * and subjects it offers (real, via AcademicLevelsService/SubjectsService)
 * and its groups (real, joining Group + its Class + Sessions + Teacher +
 * Room + Student — Groupes edits them, Paramètres/onboarding just read
 * counts off them).
 */

/** Weekly slot. Days are 0 = lundi … 6 = dimanche; no days = not scheduled.
 *  `start` is always on the hour ("18:00") and `duration` a multiple of 60 —
 *  the real ClassSession only stores whole start/end hours. */
export interface Slot {
  days: number[];
  start: string;
  duration: number;
}

export interface GroupRow {
  id: number;
  classeId: number;
  subject: string;
  level: string;
  number: number;
  teacherId: number | null;
  teacher: string;
  roomId: number | null;
  room: string;
  schedule: Slot;
  /** Whether `schedule` is this group's own sessions, vs inherited from its class (no override). */
  hasOwnSchedule: boolean;
  capacity: number;
  price: number;
  studentIds: number[];
  students: string[];
}

export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
export const DEFAULT_DURATION = 90;

/** One row per session (real, whole-hour) -> the UI's single weekly Slot. Every session sharing a group is assumed to share the same start/end, which holds for anything created through this page. */
export function sessionsToSlot(sessions: Session[]): Slot {
  if (!sessions.length) return { days: [], start: '', duration: 0 };
  const days = sessions.map(s => s.day).sort((a, b) => a - b);
  const first = sessions[0];
  return { days, start: `${String(first.startHour).padStart(2, '0')}:00`, duration: (first.endHour - first.startHour) * 60 };
}

/** The UI's single weekly Slot -> one real session payload per day (duration rounded up to the nearest hour: real sessions have no minutes). */
export function slotToSessionPayloads(s: Slot): { day: number; startHour: number; endHour: number }[] {
  if (!s.days.length || !s.start) return [];
  const startHour = Number(s.start.split(':')[0]);
  const endHour = startHour + Math.max(1, Math.round(s.duration / 60));
  return s.days.map(day => ({ day, startHour, endHour }));
}

@Injectable({ providedIn: 'root' })
export class CentreStore {
  private academicLevelsService = inject(AcademicLevelsService);
  private subjectsService = inject(SubjectsService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private sessionsService = inject(SessionsService);
  private teachersService = inject(TeachersService);
  private roomsService = inject(RoomsService);
  private studentsService = inject(StudentsService);

  /** Real — either Super-Admin-assigned or self-added in Paramètres. */
  readonly levels = computed(() => this.academicLevelsService.levels().map(l => l.name));
  readonly subjects = computed(() => this.subjectsService.subjects().map(s => s.name));

  readonly groups = computed<GroupRow[]>(() => {
    const classes = this.classesService.classes();
    const sessions = this.sessionsService.sessions();
    const teachers = this.teachersService.teachers();
    const rooms = this.roomsService.rooms();
    const students = this.studentsService.students();

    return this.groupsService.groups().flatMap(g => {
      const classe = classes.find(c => c.id === g.classeId);
      if (!classe) return [];

      const teacherId = g.teacherId ?? classe.teacherId;
      const roomId = g.roomId ?? classe.roomId;
      const price = g.monthlyPrice ?? classe.monthlyPrice;
      const teacherObj = teacherId !== null ? teachers.find(t => t.id === teacherId) : undefined;
      const roomObj = roomId !== null ? rooms.find(r => r.id === roomId) : undefined;

      const ownSessions = sessions.filter(s => s.groupId === g.id && !s.isCancelled);
      const classSessions = sessions.filter(s => s.classeId === g.classeId && s.groupId === null && !s.isCancelled);
      const effective = ownSessions.length ? ownSessions : classSessions;

      const row: GroupRow = {
        id: g.id,
        classeId: g.classeId,
        subject: classe.subject,
        level: classe.level,
        number: g.groupNumber,
        teacherId,
        teacher: teacherObj ? `${teacherObj.firstName} ${teacherObj.lastName}` : (teacherId !== null ? 'Enseignant supprimé' : 'Sans enseignant'),
        roomId,
        room: roomObj?.name ?? (roomId !== null ? 'Salle supprimée' : 'Sans salle'),
        schedule: sessionsToSlot(effective),
        hasOwnSchedule: ownSessions.length > 0,
        capacity: g.maxCapacity,
        price: price ?? 0,
        studentIds: g.studentIds,
        students: g.studentIds.map(id => {
          const s = students.find(x => x.id === id);
          return s ? `${s.firstName} ${s.lastName}` : 'Élève supprimé';
        }),
      };
      return [row];
    });
  });

  readonly isNew = computed(() => this.groups().length === 0);

  /** Groups still using a level or subject: those can't be removed. */
  usage(kind: 'level' | 'subject', name: string): number {
    return this.groups().filter(g => (kind === 'level' ? g.level : g.subject) === name).length;
  }
}

export function sameName(a: string, b: string): boolean {
  const n = (v: string) => v.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  return n(a) === n(b);
}
