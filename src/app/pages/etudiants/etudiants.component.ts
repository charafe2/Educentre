import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentsService } from '../../services/students.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { ToastService } from '../../services/toast.service';
import { Group } from '../../models/group.model';
import { Classe } from '../../models/classe.model';
import { ModalComponent } from '../../components/modal/modal.component';
import { Student } from '../../models/student.model';

@Component({
  selector: 'app-etudiants',
  imports: [NgClass, FormsModule, ModalComponent],
  templateUrl: './etudiants.component.html',
  styleUrl: './etudiants.component.css'
})
export class EtudiantsComponent {
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private toast = inject(ToastService);

  searchTerm = signal('');
  selectedLevel = signal('');
  selectedStatus = signal('');
  selectedPaymentStatus = signal('');

  levels = ['3ème Collège', 'Tronc Commun', '1ère Bac', '2ème Bac'];

  students = this.studentsService.students;

  filteredStudents = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const level = this.selectedLevel();
    const status = this.selectedStatus();
    const payment = this.selectedPaymentStatus();
    return this.students().filter(s => {
      const matchesSearch = !term ||
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        s.school.toLowerCase().includes(term);
      const matchesLevel = !level || s.level === level;
      const matchesStatus = !status || s.status === status;
      const matchesPayment = !payment || s.paymentStatus === payment;
      return matchesSearch && matchesLevel && matchesStatus && matchesPayment;
    });
  });

  totalCount = computed(() => this.students().length);
  activeCount = computed(() => this.students().filter(s => s.status === 'active').length);

  showModal = signal(false);
  editingStudent = signal<Student | null>(null);
  showDetailPanel = signal<Student | null>(null);

  selectedClassIds: number[] = [];

  formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    school: '',
    level: '2ème Bac',
    status: 'active' as 'active' | 'inactive',
    parentName: '',
    parentPhone: '',
    parentWhatsapp: '',
  };

  get availableClasses() {
    return this.classesService.classes();
  }

  isClassSelected(classId: number): boolean {
    return this.selectedClassIds.includes(classId);
  }

  toggleClass(classId: number): void {
    if (this.selectedClassIds.includes(classId)) {
      this.selectedClassIds = this.selectedClassIds.filter(id => id !== classId);
    } else {
      this.selectedClassIds = [...this.selectedClassIds, classId];
    }
  }

  openAdd(): void {
    this.formData = {
      firstName: '', lastName: '', birthDate: '', school: '',
      level: '2ème Bac', status: 'active',
      parentName: '', parentPhone: '', parentWhatsapp: '',
    };
    this.selectedClassIds = [];
    this.editingStudent.set(null);
    this.showModal.set(true);
  }

  openEdit(s: Student): void {
    this.formData = {
      firstName: s.firstName,
      lastName: s.lastName,
      birthDate: s.birthDate,
      school: s.school,
      level: s.level,
      status: s.status,
      parentName: s.parentName ?? '',
      parentPhone: s.parentPhone ?? '',
      parentWhatsapp: s.parentWhatsapp ?? '',
    };
    this.selectedClassIds = [...s.enrolledClassIds];
    this.editingStudent.set(s);
    this.showModal.set(true);
  }

  submit(): void {
    const editing = this.editingStudent();
    if (editing) {
      this.studentsService.update(editing.id, { ...this.formData, enrolledClassIds: this.selectedClassIds });
      const added = this.selectedClassIds.filter(id => !editing.enrolledClassIds.includes(id));
      const removed = editing.enrolledClassIds.filter(id => !this.selectedClassIds.includes(id));
      added.forEach(id => { this.classesService.enrollStudent(id, editing.id); this.groupsService.addStudent(id, editing.id); });
      removed.forEach(id => { this.classesService.unenrollStudent(id, editing.id); this.groupsService.removeStudent(id, editing.id); });
      this.toast.show('Étudiant mis à jour avec succès');
    } else {
      const newId = this.studentsService.add({
        ...this.formData,
        enrolledClassIds: this.selectedClassIds,
        paymentStatus: 'pending',
      });
      this.selectedClassIds.forEach(id => { this.classesService.enrollStudent(id, newId); this.groupsService.addStudent(id, newId); });
      this.toast.show('Étudiant ajouté avec succès');
    }
    this.showModal.set(false);
  }

  deleteStudent(s: Student): void {
    if (confirm(`Supprimer l'étudiant ${s.firstName} ${s.lastName} ?`)) {
      this.studentsService.delete(s.id);
      if (this.showDetailPanel()?.id === s.id) this.showDetailPanel.set(null);
      this.toast.show('Étudiant supprimé', 'info');
    }
  }

  getEnrolledClasses(s: Student) {
    return this.classesService.getByIds(s.enrolledClassIds);
  }

  getStudentGroups(s: Student): { classe: Classe; group: Group }[] {
    return s.enrolledClassIds.flatMap(classId => {
      const classe = this.classesService.getById(classId);
      const group = this.groupsService.getGroupForStudent(classId, s.id);
      return classe && group ? [{ classe, group }] : [];
    });
  }

  getPaymentHistory(s: Student) {
    // Show enrolled classes as a simple payment history display
    return this.classesService.getByIds(s.enrolledClassIds);
  }

  getInitials(firstName: string, lastName: string): string {
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  getPaymentLabel(status: string): string {
    const map: Record<string, string> = { paid: 'Payé', pending: 'En attente', overdue: 'Impayé' };
    return map[status] || status;
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onLevelChange(event: Event): void {
    this.selectedLevel.set((event.target as HTMLSelectElement).value);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
  }

  onPaymentStatusChange(event: Event): void {
    this.selectedPaymentStatus.set((event.target as HTMLSelectElement).value);
  }

  rappeler(s: Student): void {
    const raw = s.parentWhatsapp || s.parentPhone;
    if (!raw) {
      this.toast.show('Aucun numéro de contact enregistré', 'error');
      return;
    }
    // Normalize Moroccan number: 06XXXXXXXX → +2126XXXXXXXX
    const digits = raw.replace(/\D/g, '');
    const intl = digits.startsWith('212') ? digits : '212' + digits.replace(/^0/, '');
    const label = this.getPaymentLabel(s.paymentStatus);
    const msg = `Bonjour ${s.parentName || 'cher(e) parent'},\n\nNous vous rappelons que le paiement de *${s.firstName} ${s.lastName}* est actuellement *${label.toLowerCase()}*.\n\nMerci de bien vouloir régulariser la situation.\n\nCordialement,\nL'équipe du centre.`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank');
  }
}
