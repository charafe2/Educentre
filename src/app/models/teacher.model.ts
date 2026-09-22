export type PaymentMode = 'fixed' | 'per_student' | 'percentage';
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
  iban?: string;
  classIds: number[];
  status: 'active' | 'inactive';
  avatarColor: string;
}
