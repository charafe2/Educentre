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
  invoiceGenerated: boolean;
}
