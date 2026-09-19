import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService } from '../../services/documents.service';
import { PaymentsService } from '../../services/payments.service';
import { StudentsService } from '../../services/students.service';
import { ClassesService } from '../../services/classes.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { ReceiptPreviewComponent } from '../../components/receipt-preview/receipt-preview.component';
import { Document } from '../../models/document.model';
import { Payment } from '../../models/payment.model';
import { ReceiptCustomizationService } from '../../services/receipt-customization.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-documents',
  imports: [NgClass, FormsModule, ModalComponent, ReceiptPreviewComponent, TranslatePipe],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent {
  private documentsService = inject(DocumentsService);
  private paymentsService = inject(PaymentsService);
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private toast = inject(ToastService);
  private receiptCustomization = inject(ReceiptCustomizationService);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  searchTerm = signal('');
  selectedType = signal('');

  documents = this.documentsService.documents;
  students = this.studentsService.students;
  payments = this.paymentsService.payments;

  filteredDocuments = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const type = this.selectedType();
    return this.documents().filter(d => {
      const student = this.studentsService.getById(d.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}` : '';
      const classe = this.classesService.getById(d.classeId);
      const className = classe?.name ?? '';
      const matchesSearch = !term ||
        studentName.toLowerCase().includes(term) ||
        d.invoiceNumber.toLowerCase().includes(term) ||
        className.toLowerCase().includes(term);
      const matchesType = !type || d.type === type;
      return matchesSearch && matchesType;
    });
  });

  totalCount   = computed(() => this.documents().length);
  sentCount    = computed(() => this.documents().filter(d => d.sentViaWhatsapp).length);
  pendingCount = computed(() => this.documents().filter(d => !d.sentViaWhatsapp).length);
  totalAmount  = computed(() => this.documents().reduce((sum, d) => sum + d.amount, 0));

  showGenerateModal = signal(false);
  previewDocument = signal<Document | null>(null);
  receiptSettings = this.receiptCustomization.settings;
  genSelectedStudentId = signal(0);
  genSelectedPaymentId = signal(0);
  genType = signal<'Reçu' | 'Relevé' | 'Attestation'>('Reçu');

  studentPayments = computed(() => {
    const sid = this.genSelectedStudentId();
    if (!sid) return [];
    return this.paymentsService.getByStudent(sid);
  });

  openGenerateModal(): void {
    const firstStudent = this.students()[0];
    this.genSelectedStudentId.set(firstStudent?.id ?? 0);
    this.genSelectedPaymentId.set(0);
    this.genType.set('Reçu');
    this.showGenerateModal.set(true);
  }

  generate(): void {
    const paymentId = this.genSelectedPaymentId();
    const payment = this.payments().find(p => p.id === paymentId);
    if (!payment) {
      this.toast.show(this.t('documents.selectAPayment'), 'error');
      return;
    }
    this.documentsService.generateFromPayment(payment, this.genType());
    this.toast.show(this.t('documents.toastGenerated'));
    this.showGenerateModal.set(false);
  }

  markSentWhatsapp(doc: Document): void {
    this.documentsService.markSentWhatsapp(doc.id);
    this.toast.show(this.t('documents.toastMarkedSent'));
  }

  bulkSendWhatsapp(): void {
    const unsent = this.documents().filter(d => !d.sentViaWhatsapp);
    unsent.forEach(d => this.documentsService.markSentWhatsapp(d.id));
    this.toast.show(this.t('documents.toastBulkSent', { count: unsent.length }));
  }

  deleteDocument(doc: Document): void {
    if (confirm(this.t('documents.confirmDelete'))) {
      this.documentsService.delete(doc.id);
      this.toast.show(this.t('documents.toastDeleted'), 'info');
    }
  }

  previewReceipt(doc: Document): void {
    if (!this.isReceipt(doc)) {
      this.toast.show(this.t('documents.previewOnlyReceipts'), 'info');
      return;
    }
    this.previewDocument.set(doc);
  }

  closeReceiptPreview(): void {
    this.previewDocument.set(null);
  }

  async downloadReceipt(doc: Document): Promise<void> {
    if (!this.isReceipt(doc)) {
      this.toast.show(this.t('documents.simulatedDownload'), 'info');
      return;
    }
    try {
      await this.receiptCustomization.downloadReceipt(this.getReceiptData(doc));
      this.toast.show(this.t('documents.receiptReady'));
    } catch {
      this.toast.show(this.t('documents.pdfError'), 'error');
    }
  }

  getReceiptData(doc: Document) {
    const student = this.studentsService.getById(doc.studentId);
    const classe = this.classesService.getById(doc.classeId);
    const payment = this.payments().find(p => p.id === doc.paymentId);
    return this.receiptCustomization.fromDocument(doc, student, classe, payment);
  }

  isReceipt(doc: Document): boolean {
    return (doc.type as string) === 'Reçu' || (doc.type as string) === 'ReÃ§u';
  }

  getStudentName(studentId: number): string {
    const s = this.studentsService.getById(studentId);
    return s ? `${s.firstName} ${s.lastName}` : this.t('documents.studentFallback', { id: studentId });
  }

  getClassName(classeId: number): string {
    const c = this.classesService.getById(classeId);
    return c ? c.name : '-';
  }

  getPeriodLabel(period: string): string {
    const map: Record<string, string> = {
      '2025-01': 'Jan 2025', '2025-02': 'Fév 2025', '2025-03': 'Mar 2025',
      '2025-04': 'Avr 2025', '2025-05': 'Mai 2025',
    };
    return map[period] ?? period;
  }

  onSearch(event: Event): void { this.searchTerm.set((event.target as HTMLInputElement).value); }
  onTypeChange(event: Event): void { this.selectedType.set((event.target as HTMLSelectElement).value); }
}
