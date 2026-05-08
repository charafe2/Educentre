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
  iban?: string;
  classIds: number[];
  status: 'active' | 'inactive';
  avatarColor: string;
}
