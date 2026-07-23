import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { StudentsService } from '../../services/students.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { AcademicLevelsService } from '../../services/academic-levels.service';
import { ToastService } from '../../services/toast.service';
import { Group } from '../../models/group.model';
import { Classe } from '../../models/classe.model';
import { ModalComponent } from '../../components/modal/modal.component';
import { Student } from '../../models/student.model';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-etudiants',
  imports: [NgClass, FormsModule, ModalComponent, TranslatePipe],
  templateUrl: './etudiants.component.html',
  styleUrl: './etudiants.component.css'
})
export class EtudiantsComponent {
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private academicLevelsService = inject(AcademicLevelsService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  searchTerm = signal('');
  selectedLevel = signal('');
  selectedStatus = signal('');
  selectedPaymentStatus = signal('');

  // Academic levels assigned to this center by the Super Admin.
  levels = computed(() => this.academicLevelsService.levels().map(l => l.name));

  students = this.studentsService.pagedStudents;
  pagination = this.studentsService.pagination;
  studentSummary = this.studentsService.summary;
  loadingPage = this.studentsService.loadingPage;

  filteredStudents = computed(() => this.students());

  totalCount = computed(() => this.studentSummary().total);
  activeCount = computed(() => this.studentSummary().active);
  inactiveCount = computed(() => this.studentSummary().inactive);
  overduePaymentCount = computed(() => this.studentSummary().overduePayments);
  activeRate = computed(() => {
    const total = this.totalCount();
    return total > 0 ? Math.round((this.activeCount() / total) * 100) : 0;
  });
  resultCount = computed(() => this.pagination().total);
  pageRangeLabel = computed(() => {
    const page = this.pagination();
    if (!page.total) return this.t('students.noResult');
    return this.t('students.rangeLabel', { from: page.from ?? 0, to: page.to ?? 0, total: page.total });
  });

  showModal = signal(false);
  editingStudent = signal<Student | null>(null);
  showDetailPanel = signal<Student | null>(null);

  selectedClassIds: number[] = [];

  formData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    school: '',
    level: '',
    status: 'active' as 'active' | 'inactive',
    parentName: '',
    parentPhone: '',
    parentWhatsapp: '',
  };

  get availableClasses() {
    return this.classesService.classes();
  }

  get filteredAvailableClasses() {
    const selectedLevel = this.formData.level;
    if (!selectedLevel) return [];

    return this.availableClasses.filter(cls => this.levelMatches(cls.level, selectedLevel));
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
      level: '', status: 'active',
      parentName: '', parentPhone: '', parentWhatsapp: '',
    };
    this.selectedClassIds = [];
    this.editingStudent.set(null);
    this.showModal.set(true);
  }

  onFormLevelChange(level: string): void {
    this.formData.level = level;
    this.selectedClassIds = this.selectedClassIds.filter(classId => {
      const classe = this.classesService.getById(classId);
      return classe ? this.levelMatches(classe.level, level) : false;
    });
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
      this.studentsService.update(editing.id, { ...this.formData, enrolledClassIds: this.selectedClassIds }).subscribe(() => {
        const added = this.selectedClassIds.filter(id => !editing.enrolledClassIds.includes(id));
        const groupUpdates = forkJoin(
          added.length ? added.map(id => this.groupsService.addStudent(id, editing.id)) : [of(null)]
        );
        groupUpdates.subscribe(() => {
          this.classesService.loadClasses();
          this.groupsService.loadGroups();
          this.toast.show(this.t('students.toastUpdated'));
          this.showModal.set(false);
        });
      });
    } else {
      this.studentsService.add({
        ...this.formData,
        enrolledClassIds: this.selectedClassIds,
        paymentStatus: 'pending',
      }).subscribe(res => {
        const newId = res.data.id;
        const groupUpdates = forkJoin(
          this.selectedClassIds.length ? this.selectedClassIds.map(id => this.groupsService.addStudent(id, newId)) : [of(null)]
        );
        groupUpdates.subscribe(() => {
          this.classesService.loadClasses();
          this.toast.show(this.t('students.toastAdded'));
          this.showModal.set(false);
        });
      });
    }
  }

  deleteStudent(s: Student): void {
    if (confirm(this.t('students.confirmDelete', { name: `${s.firstName} ${s.lastName}` }))) {
      this.studentsService.delete(s.id).subscribe(() => {
        if (this.showDetailPanel()?.id === s.id) this.showDetailPanel.set(null);
        this.toast.show(this.t('students.toastDeleted'), 'info');
      });
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
    const map: Record<string, string> = {
      paid: this.t('students.paidLabel'),
      pending: this.t('students.pendingLabel'),
      overdue: this.t('students.overdueLabel'),
    };
    return map[status] || status;
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.loadPage(1);
  }

  onLevelChange(event: Event): void {
    this.selectedLevel.set((event.target as HTMLSelectElement).value);
    this.loadPage(1);
  }

  onStatusChange(event: Event): void {
    this.selectedStatus.set((event.target as HTMLSelectElement).value);
    this.loadPage(1);
  }

  onPaymentStatusChange(event: Event): void {
    this.selectedPaymentStatus.set((event.target as HTMLSelectElement).value);
    this.loadPage(1);
  }

  nextPage(): void {
    const page = this.pagination();
    if (page.current_page < page.last_page) {
      this.loadPage(page.current_page + 1);
    }
  }

  previousPage(): void {
    const page = this.pagination();
    if (page.current_page > 1) {
      this.loadPage(page.current_page - 1);
    }
  }

  private loadPage(page: number): void {
    this.studentsService.loadStudentPage({
      page,
      perPage: 8,
      search: this.searchTerm().trim(),
      level: this.selectedLevel(),
      status: this.selectedStatus(),
      paymentStatus: this.selectedPaymentStatus(),
    });
  }

  private levelMatches(classLevel: string, selectedLevel: string): boolean {
    const normalizedClassLevel = this.normalizeLevel(classLevel);
    const normalizedSelectedLevel = this.normalizeLevel(selectedLevel);

    return normalizedClassLevel === normalizedSelectedLevel
      || normalizedClassLevel.startsWith(`${normalizedSelectedLevel} `);
  }

  private normalizeLevel(level: string): string {
    return level
      .trim()
      .toLocaleLowerCase('fr-FR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  rappeler(s: Student): void {
    const raw = s.parentWhatsapp || s.parentPhone;
    if (!raw) {
      this.toast.show(this.t('students.noContact'), 'error');
      return;
    }
    // Normalize Moroccan number: 06XXXXXXXX → +2126XXXXXXXX
    const digits = raw.replace(/\D/g, '');
    const intl = digits.startsWith('212') ? digits : '212' + digits.replace(/^0/, '');
    const label = this.getPaymentLabel(s.paymentStatus);
    const msg = this.t('students.whatsappMessage', {
      parent: s.parentName || this.t('students.dearParent'),
      name: `${s.firstName} ${s.lastName}`,
      status: label.toLowerCase(),
    });
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank');
  }
}
