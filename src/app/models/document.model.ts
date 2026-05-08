export interface Document {
  id: number;
  invoiceNumber: string;
  paymentId: number;
  studentId: number;
  classeId: number;
  periodMonth: string;
  amount: number;
  type: 'Reçu' | 'Relevé' | 'Attestation';
  sentViaWhatsapp: boolean;
  generatedAt: string;
}
