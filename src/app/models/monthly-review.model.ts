// Shared types for the "Revue mensuelle" (Monthly Review) guided workspace.
// Kept in one place so slides/cards/services agree on the same shapes.

export interface MonthlyReviewSlideConfig {
  id: string;
  label: string;
  icon: string;
}

export interface TeacherPayrollRecord {
  teacherId: number;
  month: string; // 'YYYY-MM'
  paid: boolean;
  paidAt?: string;
  method?: string;
}

export interface TeacherSalaryRow {
  teacherId: number;
  firstName: string;
  lastName: string;
  avatarColor: string;
  specialty: string;
  amountOwed: number;
  paid: boolean;
  paidAt?: string;
}

export interface MonthlyTask {
  id: string;
  label: string;
  description?: string;
}

export interface MonthlyKpi {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone: 'accent' | 'success' | 'warning' | 'danger' | 'neutral';
}

export type ReviewSlideId = 'salaries' | 'payments' | 'summary' | 'tasks' | 'insights';

export interface StudentPaymentRow {
  paymentId: number;
  studentId: number;
  studentName: string;
  avatarColor: string;
  className: string;
  classeId: number;
  teacherId: number | null;
  teacherName: string;
  amount: number;
  dueDate: string; // ISO date — see MonthlySummarySlide/StudentPaymentSlide TODO re: no explicit due-date field yet
  phone?: string;
}
