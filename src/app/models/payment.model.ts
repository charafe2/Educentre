export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'overdue';
export type PaymentMethod = 'Espèces' | 'Virement' | 'Chèque';
export interface Payment {
  id: number;
  studentId: number;
  classeId: number;
  periodMonth: string; // 'YYYY-MM'
  amount: number;
  /** How much of `amount` has actually been received — equals `amount` when
   *  `status` is 'paid', 0 when 'pending'/'overdue', in-between when 'partial'. */
  amountPaid: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  paidAt?: string;
  note?: string;
  invoiceGenerated: boolean;
}
