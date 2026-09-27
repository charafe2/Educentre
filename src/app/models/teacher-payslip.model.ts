export interface PayslipClassRow {
  className: string;
  subject: string;
  level: string;
  studentCount: number;
  monthlyPrice: number;
  /** This class's share of the teacher's total pay — 0 for `fixed` mode,
   *  where pay isn't tied to any one class. */
  contribution: number;
}

export interface TeacherPayslipData {
  teacherName: string;
  specialty: string;
  email: string;
  phone: string;
  period: string;
  generatedAt: string;
  paymentMode: 'fixed' | 'per_student' | 'percentage';
  paymentModeLabel: string;
  /** Human sentence describing the rate, e.g. "50 Dhs par étudiant assigné"
   *  or "40% du prix mensuel de chaque étudiant assigné". */
  paymentModeDetail: string;
  classRows: PayslipClassRow[];
  totalStudents: number;
  totalClasses: number;
  totalAmount: number;
}
