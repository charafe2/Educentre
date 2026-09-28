export type PaymentMode = 'fixed' | 'per_student' | 'percentage' | 'per_hour';
export type TeacherAccessState = 'active' | 'suspended' | 'revoked';

export interface TeacherAccess {
  /** The teacher's login — always their account email. */
  login: string;
  state: TeacherAccessState;
  lastLoginAt: string | null;
}

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
  /** `percentage` mode: share (0-100) of each assigned student's class
   *  monthlyPrice, not a flat per-student rate. */
  percentageRate?: number;
  /** `per_hour` mode: flat rate × the teacher's weekly scheduled hours across their classes, ×4 for a month. */
  hourlyRate?: number;
  iban?: string;
  classIds: number[];
  status: 'active' | 'inactive';
  avatarColor: string;
  /** Every real teacher has an app account from creation — never null. */
  access: TeacherAccess;
}
