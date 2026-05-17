import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentsService } from '../../services/documents.service';
import { PaymentsService } from '../../services/payments.service';
import { StudentsService } from '../../services/students.service';
import { ClassesService } from '../../services/classes.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Document } from '../../models/document.model';
import { Payment } from '../../models/payment.model';

@Component({
  selector: 'app-documents',
  imports: [NgClass, FormsModule, ModalComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent {
  private documentsService = inject(DocumentsService);
  private paymentsService = inject(PaymentsService);
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private toast = inject(ToastService);

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

  downloadSimulated(): void {
    this.toast.show('Téléchargement simulé (PDF)', 'info');
  }

  getStudentName(studentId: number): string {
    const s = this.studentsService.getById(studentId);
    return s ? `${s.firstName} ${s.lastName}` : '—';
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
}
