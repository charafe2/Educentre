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
import { Student } from '../../models/student.model';

@Component({
  selector: 'app-documents',
  imports: [NgClass, FormsModule, ModalComponent, ReceiptPreviewComponent],
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

  searchTerm = signal('');
  selectedType = signal('');

  storedDocuments = this.documentsService.documents;
  students = this.studentsService.students;
  payments = this.paymentsService.payments;

  documents = computed(() => {
    const payments = this.payments();
    const hasLiveData = this.students().length > 0 || payments.length > 0;
    const paymentById = new Map(payments.map(payment => [payment.id, payment]));
    const enrichedStoredDocuments = this.storedDocuments()
      .map(doc => this.withPaymentData(doc, paymentById.get(doc.paymentId)))
      .filter(doc => !hasLiveData || this.hasStudent(doc.studentId));
    const usedPaymentIds = new Set(enrichedStoredDocuments.map(doc => doc.paymentId));
    const generatedPaymentDocuments = payments
      .filter(payment => (payment.invoiceGenerated || payment.status === 'paid') && !usedPaymentIds.has(payment.id))
      .map((payment, index) => this.documentFromPayment(payment, index));

    return [...generatedPaymentDocuments, ...enrichedStoredDocuments]
      .sort((first, second) => second.generatedAt.localeCompare(first.generatedAt));
  });

  filteredDocuments = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const type = this.selectedType();
    return this.documents().filter(d => {
      const studentName = this.getStudentName(d.studentId);
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
      this.toast.show('Sélectionnez un paiement', 'error');
      return;
    }
    this.documentsService.generateFromPayment(payment, this.genType());
    this.toast.show('Document généré avec succès');
    this.showGenerateModal.set(false);
  }

  markSentWhatsapp(doc: Document): void {
    this.documentsService.markSentWhatsapp(doc.id);
    this.toast.show('Marqué comme envoyé via WhatsApp');
  }

  bulkSendWhatsapp(): void {
    const unsent = this.documents().filter(d => !d.sentViaWhatsapp);
    unsent.forEach(d => this.documentsService.markSentWhatsapp(d.id));
    this.toast.show(`${unsent.length} document(s) marqué(s) comme envoyés`);
  }

  deleteDocument(doc: Document): void {
    if (confirm('Supprimer ce document ?')) {
      this.documentsService.delete(doc.id);
      this.toast.show('Document supprimé', 'info');
    }
  }

  previewReceipt(doc: Document): void {
    if (!this.isReceipt(doc)) {
      this.toast.show('La prévisualisation est disponible pour les reçus', 'info');
      return;
    }
    this.previewDocument.set(doc);
  }

  closeReceiptPreview(): void {
    this.previewDocument.set(null);
  }

  async downloadReceipt(doc: Document): Promise<void> {
    if (!this.isReceipt(doc)) {
      this.toast.show('Téléchargement simulé (PDF)', 'info');
      return;
    }
    try {
      await this.receiptCustomization.downloadReceipt(this.getReceiptData(doc));
      this.toast.show('Reçu PDF prêt à télécharger');
    } catch {
      this.toast.show('Impossible de générer le PDF du reçu', 'error');
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
    return s ? this.formatStudentName(s) : `Étudiant #${studentId}`;
  }

  getStudentInitials(studentId: number): string {
    const s = this.studentsService.getById(studentId);
    if (!s) return String(studentId).slice(-2).padStart(2, '0');
    return `${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase() || 'ET';
  }

  getStudentColor(studentId: number): string {
    return this.studentsService.getById(studentId)?.avatarColor || '#078c78';
  }

  getStudentSubtitle(doc: Document): string {
    const classe = this.classesService.getById(doc.classeId);
    const student = this.studentsService.getById(doc.studentId);
    if (classe) return classe.name;
    return student?.level || 'Classe non chargée';
  }

  private formatStudentName(student: Student): string {
    return `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() || `Étudiant #${student.id}`;
  }

  getClassName(classeId: number): string {
    const c = this.classesService.getById(classeId);
    return c ? c.name : '—';
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

  private withPaymentData(doc: Document, payment?: Payment): Document {
    if (!payment) return doc;
    return {
      ...doc,
      studentId: payment.studentId,
      classeId: payment.classeId,
      periodMonth: payment.periodMonth,
      amount: payment.amount,
    };
  }

  private documentFromPayment(payment: Payment, index: number): Document {
    const suffix = String(payment.id).padStart(4, '0');
    return {
      id: -payment.id,
      invoiceNumber: `FAC-${payment.periodMonth.slice(0, 4)}-${suffix}`,
      paymentId: payment.id,
      studentId: payment.studentId,
      classeId: payment.classeId,
      periodMonth: payment.periodMonth,
      amount: payment.amount,
      type: 'Reçu',
      sentViaWhatsapp: false,
      generatedAt: payment.paidAt || `${payment.periodMonth}-01`,
    };
  }

  private hasStudent(studentId: number): boolean {
    return this.studentsService.getById(studentId) !== undefined;
  }
}
