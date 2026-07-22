import {
  Attendance, Classe, Grade, Group, Payment, Session, Student, Teacher,
} from '../types';

// Démo autonome : l'application fonctionne sans backend.
// Pour brancher l'API réelle (même backend que le web), voir src/api/client.ts.

export const teachers: Teacher[] = [
  { id: 1, firstName: 'Karim', lastName: 'Alaoui', email: 'k.alaoui@moujtahid.ma', phone: '0661 23 45 67', specialty: 'Mathématiques', paymentMode: 'fixed', fixedSalary: 6500, classIds: [1, 2], status: 'active', avatarColor: '#4568FF' },
  { id: 2, firstName: 'Salma', lastName: 'Bennis', email: 's.bennis@moujtahid.ma', phone: '0662 98 76 54', specialty: 'Physique-Chimie', paymentMode: 'per_student', ratePerStudent: 120, classIds: [3], status: 'active', avatarColor: '#22B58D' },
  { id: 3, firstName: 'Youssef', lastName: 'Tazi', email: 'y.tazi@moujtahid.ma', phone: '0663 11 22 33', specialty: 'Français', paymentMode: 'fixed', fixedSalary: 5800, classIds: [4], status: 'active', avatarColor: '#9B55E6' },
  { id: 4, firstName: 'Imane', lastName: 'Chraibi', email: 'i.chraibi@moujtahid.ma', phone: '0664 55 66 77', specialty: 'Anglais', paymentMode: 'per_student', ratePerStudent: 100, classIds: [5, 6], status: 'active', avatarColor: '#ECA72C' },
];

export const classes: Classe[] = [
  { id: 1, name: 'Maths - 2ème Bac SM', subject: 'Mathématiques', level: '2ème Bac', teacherId: 1, teacherName: 'Karim Alaoui', roomId: 1, roomName: 'Salle 1', maxCapacity: 20, monthlyPrice: 350, enrolledStudentIds: [1, 2, 3, 4, 5], status: 'active', color: '#4568FF', bgColor: 'rgba(69,104,255,0.12)' },
  { id: 2, name: 'Maths - 1ère Bac SE', subject: 'Mathématiques', level: '1ère Bac', teacherId: 1, teacherName: 'Karim Alaoui', roomId: 2, roomName: 'Salle 2', maxCapacity: 18, monthlyPrice: 320, enrolledStudentIds: [6, 7, 8], status: 'active', color: '#3588F2', bgColor: 'rgba(53,136,242,0.13)' },
  { id: 3, name: 'Physique - 2ème Bac PC', subject: 'Physique-Chimie', level: '2ème Bac', teacherId: 2, teacherName: 'Salma Bennis', roomId: 1, roomName: 'Salle 1', maxCapacity: 20, monthlyPrice: 350, enrolledStudentIds: [1, 2, 9, 10], status: 'active', color: '#22B58D', bgColor: 'rgba(34,181,141,0.13)' },
  { id: 4, name: 'Français - Tronc commun', subject: 'Français', level: 'Tronc commun', teacherId: 3, teacherName: 'Youssef Tazi', roomId: 3, roomName: 'Salle 3', maxCapacity: 24, monthlyPrice: 250, enrolledStudentIds: [11, 12, 6], status: 'active', color: '#9B55E6', bgColor: 'rgba(155,85,230,0.13)' },
  { id: 5, name: 'Anglais - 3ème Collège', subject: 'Anglais', level: '3ème Collège', teacherId: 4, teacherName: 'Imane Chraibi', roomId: 2, roomName: 'Salle 2', maxCapacity: 16, monthlyPrice: 220, enrolledStudentIds: [3, 4, 11], status: 'active', color: '#ECA72C', bgColor: 'rgba(236,167,44,0.15)' },
  { id: 6, name: 'Anglais - Bac International', subject: 'Anglais', level: '2ème Bac', teacherId: 4, teacherName: 'Imane Chraibi', roomId: 3, roomName: 'Salle 3', maxCapacity: 16, monthlyPrice: 280, enrolledStudentIds: [5, 9], status: 'active', color: '#FF6B9D', bgColor: 'rgba(255,107,157,0.12)' },
];

// Démo : Yasmine et Lina partagent le même numéro de parent (Ahmed El Fassi) pour
// illustrer la sélection d'enfant façon Netflix quand un compte a plusieurs enfants.
export const students: Student[] = [
  { id: 1, code: 'ETU-001', firstName: 'Yasmine', lastName: 'El Fassi', birthDate: '2007-03-14', school: 'Lycée Mohammed V', level: '2ème Bac', enrolledClassIds: [1, 3], paymentStatus: 'paid', status: 'active', avatarColor: '#4568FF', parentName: 'Ahmed El Fassi', parentPhone: '0661 44 55 66', parentPassword: 'parent2026', absenceCount: 1, totalSessions: 24, createdAt: '2025-09-02' },
  { id: 2, code: 'ETU-002', firstName: 'Omar', lastName: 'Berrada', birthDate: '2007-07-22', school: 'Lycée Descartes', level: '2ème Bac', enrolledClassIds: [1, 3], paymentStatus: 'pending', status: 'active', avatarColor: '#22B58D', parentName: 'Nadia Berrada', parentPhone: '0662 33 44 55', parentPassword: 'parent2026', absenceCount: 3, totalSessions: 24, createdAt: '2025-09-02' },
  { id: 3, code: 'ETU-003', firstName: 'Lina', lastName: 'Cherkaoui', birthDate: '2009-01-08', school: 'Collège Anatole France', level: '3ème Collège', enrolledClassIds: [1, 5], paymentStatus: 'paid', status: 'active', avatarColor: '#9B55E6', parentName: 'Ahmed El Fassi', parentPhone: '0661 44 55 66', parentPassword: 'parent2026', absenceCount: 0, totalSessions: 20, createdAt: '2025-09-05' },
  { id: 4, code: 'ETU-004', firstName: 'Adam', lastName: 'Benjelloun', birthDate: '2009-11-30', school: 'Groupe Scolaire Al Jabr', level: '3ème Collège', enrolledClassIds: [1, 5], paymentStatus: 'overdue', status: 'active', avatarColor: '#ECA72C', parentName: 'Samira Benjelloun', parentPhone: '0664 11 22 33', parentPassword: 'parent2026', absenceCount: 5, totalSessions: 20, createdAt: '2025-09-05' },
  { id: 5, code: 'ETU-005', firstName: 'Sofia', lastName: 'Amrani', birthDate: '2007-05-19', school: 'Lycée Lyautey', level: '2ème Bac', enrolledClassIds: [1, 6], paymentStatus: 'paid', status: 'active', avatarColor: '#FF6B9D', parentName: 'Karim Amrani', parentPhone: '0665 77 88 99', parentPassword: 'parent2026', absenceCount: 2, totalSessions: 22, createdAt: '2025-09-08' },
  { id: 6, code: 'ETU-006', firstName: 'Mehdi', lastName: 'Lahlou', birthDate: '2008-02-11', school: 'Lycée Al Khawarizmi', level: '1ère Bac', enrolledClassIds: [2, 4], paymentStatus: 'paid', status: 'active', avatarColor: '#3588F2', parentName: 'Fouad Lahlou', parentPhone: '0666 12 34 56', parentPassword: 'parent2026', absenceCount: 1, totalSessions: 18, createdAt: '2025-09-10' },
  { id: 7, code: 'ETU-007', firstName: 'Aya', lastName: 'Sekkat', birthDate: '2008-09-03', school: 'Lycée Ibn Toumert', level: '1ère Bac', enrolledClassIds: [2], paymentStatus: 'pending', status: 'active', avatarColor: '#36C8B3', parentName: 'Latifa Sekkat', parentPhone: '0667 98 76 54', parentPassword: 'parent2026', absenceCount: 0, totalSessions: 12, createdAt: '2025-09-12' },
  { id: 8, code: 'ETU-008', firstName: 'Rayan', lastName: 'Ouazzani', birthDate: '2008-12-25', school: 'Lycée Descartes', level: '1ère Bac', enrolledClassIds: [2], paymentStatus: 'overdue', status: 'active', avatarColor: '#FF9500', parentName: 'Hassan Ouazzani', parentPhone: '0668 55 44 33', parentPassword: 'parent2026', absenceCount: 4, totalSessions: 12, createdAt: '2025-09-15' },
  { id: 9, code: 'ETU-009', firstName: 'Nour', lastName: 'Bensaid', birthDate: '2007-04-17', school: 'Lycée Mohammed V', level: '2ème Bac', enrolledClassIds: [3, 6], paymentStatus: 'paid', status: 'active', avatarColor: '#4568FF', parentName: 'Amina Bensaid', parentPhone: '0669 11 33 55', parentPassword: 'parent2026', absenceCount: 1, totalSessions: 22, createdAt: '2025-09-18' },
  { id: 10, code: 'ETU-010', firstName: 'Ziad', lastName: 'Filali', birthDate: '2007-08-09', school: 'Lycée Al Khansaa', level: '2ème Bac', enrolledClassIds: [3], paymentStatus: 'paid', status: 'active', avatarColor: '#22B58D', parentName: 'Othmane Filali', parentPhone: '0670 22 44 66', parentPassword: 'parent2026', absenceCount: 2, totalSessions: 14, createdAt: '2025-09-20' },
  { id: 11, code: 'ETU-011', firstName: 'Kenza', lastName: 'Mansouri', birthDate: '2010-06-27', school: 'Collège Ibn Batouta', level: '3ème Collège', enrolledClassIds: [4, 5], paymentStatus: 'pending', status: 'active', avatarColor: '#9B55E6', parentName: 'Saïd Mansouri', parentPhone: '0671 33 55 77', parentPassword: 'parent2026', absenceCount: 0, totalSessions: 16, createdAt: '2025-09-22' },
  { id: 12, code: 'ETU-012', firstName: 'Ilyas', lastName: 'Naciri', birthDate: '2010-10-05', school: 'Collège Al Massira', level: 'Tronc commun', enrolledClassIds: [4], paymentStatus: 'paid', status: 'inactive', avatarColor: '#6E6E73', parentName: 'Khadija Naciri', parentPhone: '0672 44 66 88', parentPassword: 'parent2026', absenceCount: 6, totalSessions: 10, createdAt: '2025-09-25' },
];

export const groups: Group[] = [
  { id: 1, classeId: 1, groupNumber: 1, studentIds: [1, 2, 3], maxCapacity: 10 },
  { id: 2, classeId: 1, groupNumber: 2, studentIds: [4, 5], maxCapacity: 10 },
  { id: 3, classeId: 2, groupNumber: 1, studentIds: [6, 7, 8], maxCapacity: 9 },
  { id: 4, classeId: 3, groupNumber: 1, studentIds: [1, 2, 9, 10], maxCapacity: 10 },
  { id: 5, classeId: 4, groupNumber: 1, studentIds: [11, 12, 6], maxCapacity: 12 },
  { id: 6, classeId: 5, groupNumber: 1, studentIds: [3, 4, 11], maxCapacity: 8 },
  { id: 7, classeId: 6, groupNumber: 1, studentIds: [5, 9], maxCapacity: 8 },
];

// day: 0=Lundi .. 5=Samedi
export const sessions: Session[] = [
  { id: 1, classeId: 1, day: 0, startHour: 18, endHour: 20, isCancelled: false },
  { id: 2, classeId: 1, day: 3, startHour: 18, endHour: 20, isCancelled: false },
  { id: 3, classeId: 2, day: 1, startHour: 17, endHour: 19, isCancelled: false },
  { id: 4, classeId: 3, day: 2, startHour: 18, endHour: 20, isCancelled: false },
  { id: 5, classeId: 3, day: 5, startHour: 10, endHour: 12, isCancelled: false },
  { id: 6, classeId: 4, day: 2, startHour: 16, endHour: 18, isCancelled: false },
  { id: 7, classeId: 5, day: 4, startHour: 17, endHour: 19, isCancelled: false },
  { id: 8, classeId: 6, day: 5, startHour: 14, endHour: 16, isCancelled: false },
  { id: 9, classeId: 2, day: 4, startHour: 19, endHour: 21, isCancelled: true, cancelReason: 'Enseignant indisponible' },
];

export const CURRENT_MONTH = '2026-07';

export const payments: Payment[] = [
  { id: 1, studentId: 1, classeId: 1, periodMonth: CURRENT_MONTH, amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-07-03' },
  { id: 2, studentId: 1, classeId: 3, periodMonth: CURRENT_MONTH, amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-07-03' },
  { id: 3, studentId: 2, classeId: 1, periodMonth: CURRENT_MONTH, amount: 350, status: 'pending' },
  { id: 4, studentId: 2, classeId: 3, periodMonth: CURRENT_MONTH, amount: 350, status: 'pending' },
  { id: 5, studentId: 3, classeId: 1, periodMonth: CURRENT_MONTH, amount: 350, status: 'paid', method: 'Virement', paidAt: '2026-07-01' },
  { id: 6, studentId: 3, classeId: 5, periodMonth: CURRENT_MONTH, amount: 220, status: 'paid', method: 'Virement', paidAt: '2026-07-01' },
  { id: 7, studentId: 4, classeId: 1, periodMonth: CURRENT_MONTH, amount: 350, status: 'overdue' },
  { id: 8, studentId: 4, classeId: 5, periodMonth: CURRENT_MONTH, amount: 220, status: 'overdue' },
  { id: 9, studentId: 5, classeId: 1, periodMonth: CURRENT_MONTH, amount: 350, status: 'paid', method: 'Chèque', paidAt: '2026-07-05' },
  { id: 10, studentId: 5, classeId: 6, periodMonth: CURRENT_MONTH, amount: 280, status: 'paid', method: 'Chèque', paidAt: '2026-07-05' },
  { id: 11, studentId: 6, classeId: 2, periodMonth: CURRENT_MONTH, amount: 320, status: 'paid', method: 'Espèces', paidAt: '2026-07-02' },
  { id: 12, studentId: 6, classeId: 4, periodMonth: CURRENT_MONTH, amount: 250, status: 'paid', method: 'Espèces', paidAt: '2026-07-02' },
  { id: 13, studentId: 7, classeId: 2, periodMonth: CURRENT_MONTH, amount: 320, status: 'pending' },
  { id: 14, studentId: 8, classeId: 2, periodMonth: CURRENT_MONTH, amount: 320, status: 'overdue' },
  { id: 15, studentId: 9, classeId: 3, periodMonth: CURRENT_MONTH, amount: 350, status: 'paid', method: 'Virement', paidAt: '2026-07-04' },
  { id: 16, studentId: 9, classeId: 6, periodMonth: CURRENT_MONTH, amount: 280, status: 'paid', method: 'Virement', paidAt: '2026-07-04' },
  { id: 17, studentId: 10, classeId: 3, periodMonth: CURRENT_MONTH, amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-07-06' },
  { id: 18, studentId: 11, classeId: 4, periodMonth: CURRENT_MONTH, amount: 250, status: 'pending' },
  { id: 19, studentId: 11, classeId: 5, periodMonth: CURRENT_MONTH, amount: 220, status: 'pending' },
  // Historique du mois précédent (vue parent)
  { id: 20, studentId: 1, classeId: 1, periodMonth: '2026-06', amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-06-04' },
  { id: 21, studentId: 1, classeId: 3, periodMonth: '2026-06', amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-06-04' },
  { id: 22, studentId: 1, classeId: 1, periodMonth: '2026-05', amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-05-05' },
  { id: 23, studentId: 1, classeId: 3, periodMonth: '2026-05', amount: 350, status: 'paid', method: 'Espèces', paidAt: '2026-05-06' },
];

export const attendance: Attendance[] = [
  { id: 1, sessionId: 1, studentId: 1, attendedOn: '2026-07-06', status: 'present' },
  { id: 2, sessionId: 2, studentId: 1, attendedOn: '2026-07-09', status: 'present' },
  { id: 3, sessionId: 4, studentId: 1, attendedOn: '2026-07-08', status: 'late', note: 'Arrivée 18h20' },
  { id: 4, sessionId: 5, studentId: 1, attendedOn: '2026-07-11', status: 'present' },
  { id: 5, sessionId: 1, studentId: 1, attendedOn: '2026-06-29', status: 'present' },
  { id: 6, sessionId: 2, studentId: 1, attendedOn: '2026-07-02', status: 'absent', note: 'Non justifiée' },
  { id: 7, sessionId: 4, studentId: 1, attendedOn: '2026-07-01', status: 'present' },
  { id: 8, sessionId: 5, studentId: 1, attendedOn: '2026-07-04', status: 'present' },
  { id: 9, sessionId: 1, studentId: 2, attendedOn: '2026-07-06', status: 'absent' },
  { id: 10, sessionId: 4, studentId: 2, attendedOn: '2026-07-08', status: 'present' },
];

export const grades: Grade[] = [
  { id: 1, studentId: 1, classeId: 1, label: 'Contrôle 3 - Dérivées', score: 18, date: '2026-07-05' },
  { id: 2, studentId: 1, classeId: 1, label: 'Contrôle 2 - Limites', score: 16.5, date: '2026-06-14' },
  { id: 3, studentId: 1, classeId: 3, label: 'Devoir - Électricité', score: 15, date: '2026-06-28' },
  { id: 4, studentId: 1, classeId: 3, label: 'Quiz - Mécanique', score: 17, date: '2026-07-10' },
  { id: 5, studentId: 1, classeId: 1, label: 'Contrôle 1 - Suites', score: 14.5, date: '2026-05-20' },
  { id: 6, studentId: 2, classeId: 1, label: 'Contrôle 3 - Dérivées', score: 12, date: '2026-07-05' },
  { id: 7, studentId: 2, classeId: 3, label: 'Devoir - Électricité', score: 13.5, date: '2026-06-28' },
];

export const DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Revenus mensuels (analytiques) - aligné sur la maquette du site (34,2K MAD)
export const monthlyRevenue = [
  { month: 'Fév', amount: 26800 },
  { month: 'Mar', amount: 29400 },
  { month: 'Avr', amount: 28100 },
  { month: 'Mai', amount: 31600 },
  { month: 'Juin', amount: 33000 },
  { month: 'Juil', amount: 34200 },
];

// Présences hebdomadaires (7 dernières semaines), en %
export const weeklyAttendance = [88, 91, 86, 93, 90, 92, 94];
