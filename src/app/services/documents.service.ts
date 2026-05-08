import { Injectable, signal } from '@angular/core';
import { Document } from '../models/document.model';
import { Payment } from '../models/payment.model';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private nextId = signal(9);
  private nextInvoiceNum = signal(343);

  documents = signal<Document[]>([
    { id: 1, invoiceNumber: 'FAC-2025-0342', paymentId: 1, studentId: 1, classeId: 1, periodMonth: '2025-05', amount: 350, type: 'Reçu', sentViaWhatsapp: true, generatedAt: '2025-05-01' },
    { id: 2, invoiceNumber: 'FAC-2025-0341', paymentId: 2, studentId: 2, classeId: 3, periodMonth: '2025-05', amount: 280, type: 'Reçu', sentViaWhatsapp: true, generatedAt: '2025-05-02' },
    { id: 3, invoiceNumber: 'FAC-2025-0340', paymentId: 3, studentId: 3, classeId: 6, periodMonth: '2025-05', amount: 300, type: 'Relevé', sentViaWhatsapp: false, generatedAt: '2025-04-30' },
    { id: 4, invoiceNumber: 'FAC-2025-0339', paymentId: 4, studentId: 4, classeId: 2, periodMonth: '2025-04', amount: 350, type: 'Reçu', sentViaWhatsapp: false, generatedAt: '2025-04-29' },
    { id: 5, invoiceNumber: 'FAC-2025-0338', paymentId: 5, studentId: 5, classeId: 4, periodMonth: '2025-05', amount: 320, type: 'Attestation', sentViaWhatsapp: true, generatedAt: '2025-05-04' },
    { id: 6, invoiceNumber: 'FAC-2025-0337', paymentId: 9, studentId: 1, classeId: 2, periodMonth: '2025-05', amount: 290, type: 'Reçu', sentViaWhatsapp: true, generatedAt: '2025-05-05' },
    { id: 7, invoiceNumber: 'FAC-2025-0336', paymentId: 7, studentId: 7, classeId: 1, periodMonth: '2025-05', amount: 350, type: 'Relevé', sentViaWhatsapp: false, generatedAt: '2025-04-28' },
    { id: 8, invoiceNumber: 'FAC-2025-0335', paymentId: 10, studentId: 2, classeId: 2, periodMonth: '2025-05', amount: 280, type: 'Reçu', sentViaWhatsapp: true, generatedAt: '2025-03-31' },
  ]);

  add(data: Omit<Document, 'id'>): number {
    const id = this.nextId();
    this.documents.update(list => [...list, { ...data, id }]);
    this.nextId.update(n => n + 1);
    return id;
  }

  generateFromPayment(payment: Payment, type: 'Reçu' | 'Relevé' | 'Attestation'): number {
    const num = this.nextInvoiceNum();
    const invoiceNumber = `FAC-2025-${String(num).padStart(4, '0')}`;
    this.nextInvoiceNum.update(n => n + 1);
    return this.add({
      invoiceNumber,
      paymentId: payment.id,
      studentId: payment.studentId,
      classeId: payment.classeId,
      periodMonth: payment.periodMonth,
      amount: payment.amount,
      type,
      sentViaWhatsapp: false,
      generatedAt: new Date().toISOString().split('T')[0],
    });
  }

  markSentWhatsapp(id: number): void {
    this.documents.update(list => list.map(d =>
      d.id === id ? { ...d, sentViaWhatsapp: true } : d
    ));
  }

  delete(id: number): void {
    this.documents.update(list => list.filter(d => d.id !== id));
  }
}
