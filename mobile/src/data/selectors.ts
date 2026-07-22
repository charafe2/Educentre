import {
  attendance, classes, CURRENT_MONTH, grades, groups, payments, sessions, students, teachers,
} from './demo';
import { Attendance, Classe, Grade, Payment, Session, Student, Teacher } from '../types';

export const getClasse = (id: number): Classe | undefined => classes.find(c => c.id === id);
export const getStudent = (id: number): Student | undefined => students.find(s => s.id === id);
export const getTeacher = (id: number | null): Teacher | undefined =>
  teachers.find(t => t.id === id);

export const activeStudents = (): Student[] => students.filter(s => s.status === 'active');

export const monthPayments = (month = CURRENT_MONTH): Payment[] =>
  payments.filter(p => p.periodMonth === month);

export function financeSummary(month = CURRENT_MONTH) {
  const list = monthPayments(month);
  const sum = (status?: Payment['status']) =>
    list.filter(p => !status || p.status === status).reduce((acc, p) => acc + p.amount, 0);
  return {
    collected: sum('paid'),
    pending: sum('pending'),
    overdue: sum('overdue'),
    expected: sum(),
    count: list.length,
    paidCount: list.filter(p => p.status === 'paid').length,
  };
}

export function attendanceRate(): number {
  const totalSessions = students.reduce((acc, s) => acc + s.totalSessions, 0);
  const totalAbsences = students.reduce((acc, s) => acc + s.absenceCount, 0);
  if (!totalSessions) return 0;
  return Math.round(((totalSessions - totalAbsences) / totalSessions) * 100);
}

export function sessionsOfDay(day: number): (Session & { classe: Classe })[] {
  return sessions
    .filter(s => s.day === day)
    .map(s => ({ ...s, classe: getClasse(s.classeId)! }))
    .filter(s => !!s.classe)
    .sort((a, b) => a.startHour - b.startHour);
}

// Score de risque simplifié - même esprit que la section "risque d'abandon" du site :
// absences, retards de paiement et inactivité pèsent sur le score.
export function riskStudents(): { student: Student; score: number }[] {
  return students
    .map(student => {
      const absenceRatio = student.totalSessions
        ? student.absenceCount / student.totalSessions
        : 0;
      let score = Math.round(absenceRatio * 60);
      if (student.paymentStatus === 'overdue') score += 30;
      if (student.paymentStatus === 'pending') score += 10;
      if (student.status === 'inactive') score += 20;
      return { student, score: Math.min(score, 100) };
    })
    .filter(r => r.score >= 40)
    .sort((a, b) => b.score - a.score);
}

export function studentClasses(student: Student): Classe[] {
  return student.enrolledClassIds
    .map(id => getClasse(id))
    .filter((c): c is Classe => !!c);
}

export function studentSessions(student: Student): (Session & { classe: Classe })[] {
  return sessions
    .filter(s => student.enrolledClassIds.includes(s.classeId))
    .map(s => ({ ...s, classe: getClasse(s.classeId)! }))
    .sort((a, b) => a.day - b.day || a.startHour - b.startHour);
}

export function studentAttendance(studentId: number): (Attendance & { classe?: Classe })[] {
  return attendance
    .filter(a => a.studentId === studentId)
    .map(a => {
      const session = sessions.find(s => s.id === a.sessionId);
      return { ...a, classe: session ? getClasse(session.classeId) : undefined };
    })
    .sort((a, b) => b.attendedOn.localeCompare(a.attendedOn));
}

export function studentGrades(studentId: number): (Grade & { classe?: Classe })[] {
  return grades
    .filter(g => g.studentId === studentId)
    .map(g => ({ ...g, classe: getClasse(g.classeId) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function studentAverage(studentId: number): number | null {
  const list = grades.filter(g => g.studentId === studentId);
  if (!list.length) return null;
  return Math.round((list.reduce((acc, g) => acc + g.score, 0) / list.length) * 10) / 10;
}

export function studentPayments(studentId: number): (Payment & { classe?: Classe })[] {
  return payments
    .filter(p => p.studentId === studentId)
    .map(p => ({ ...p, classe: getClasse(p.classeId) }))
    .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
}

export function classGroups(classeId: number) {
  return groups.filter(g => g.classeId === classeId);
}

export const allGroups = () =>
  groups.map(g => ({ ...g, classe: getClasse(g.classeId)! })).filter(g => !!g.classe);

export function formatDateFR(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}

export function formatMonthFR(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  return `${months[(m ?? 1) - 1]} ${y}`;
}
