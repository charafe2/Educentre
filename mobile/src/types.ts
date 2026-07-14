// Models — mirror src/app/models of the Angular web app so both clients
// can talk to the same API (/api/v1/*).

export interface Student {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  school: string;
  level: string;
  enrolledClassIds: number[];
  paymentStatus: 'paid' | 'pending' | 'overdue';
  status: 'active' | 'inactive';
  avatarColor: string;
  parentName?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  absenceCount: number;
  totalSessions: number;
  createdAt: string;
}

export interface Classe {
  id: number;
  name: string;
  subject: string;
  level: string;
  teacherId: number | null;
  teacherName?: string;
  roomId: number;
  roomName?: string;
  maxCapacity: number;
  monthlyPrice: number;
  enrolledStudentIds: number[];
  status: 'active' | 'inactive';
  color: string;
  bgColor: string;
}

export interface Group {
  id: number;
  classeId: number;
  groupNumber: number;
  studentIds: number[];
  maxCapacity: number;
}

export type PaymentMode = 'fixed' | 'per_student';

export interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  paymentMode: PaymentMode;
  fixedSalary?: number;
  ratePerStudent?: number;
  classIds: number[];
  status: 'active' | 'inactive';
  avatarColor: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type PaymentMethod = 'Espèces' | 'Virement' | 'Chèque';

export interface Payment {
  id: number;
  studentId: number;
  classeId: number;
  periodMonth: string; // 'YYYY-MM'
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  paidAt?: string;
  note?: string;
}

export interface Session {
  id: number;
  classeId: number;
  day: number; // 0=Lun .. 5=Sam
  startHour: number;
  endHour: number;
  isCancelled: boolean;
  cancelReason?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: number;
  sessionId: number;
  studentId: number;
  attendedOn: string;
  status: AttendanceStatus;
  note?: string;
}

export interface Grade {
  id: number;
  studentId: number;
  classeId: number;
  label: string;
  score: number; // /20
  date: string;
}

export interface AuthUser {
  uuid: string;
  name: string;
  email: string;
  role: string;
}
