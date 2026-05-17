import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService } from '../../services/groups.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Teacher } from '../../models/teacher.model';
import { Classe } from '../../models/classe.model';
import { Group } from '../../models/group.model';

interface TeacherForm {
  firstName: string; lastName: string; email: string; phone: string;
  specialty: string; paymentMode: 'fixed' | 'per_student';
  fixedSalary: number; ratePerStudent: number;
  status: 'active' | 'inactive'; classIds: number[];
}

interface TeacherRow {
  teacher: Teacher;
  classes: Classe[];
  groups: { classe: Classe; groups: Group[] }[];
  studentCount: number;
  salary: number;
}

@Component({
  selector: 'app-professeurs',
  imports: [NgClass, FormsModule, ModalComponent],
  templateUrl: './professeurs.component.html',
  styleUrl: './professeurs.component.css',
})
export class ProfesseursComponent {
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private toast = inject(ToastService);

  searchTerm = signal('');
  statusFilter = signal('');

  teachers = this.teachersService.teachers;
  classes = this.classesService.classes;

  filteredTeachers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    return this.teachers().filter(t => {
      if (status && t.status !== status) return false;
      if (!term) return true;
      return t.firstName.toLowerCase().includes(term)
        || t.lastName.toLowerCase().includes(term)
        || t.email.toLowerCase().includes(term)
        || t.specialty.toLowerCase().includes(term);
    });
  });

  teacherRows = computed<TeacherRow[]>(() => {
    const allClasses = this.classes();
    return this.filteredTeachers().map(teacher => {
      const classes = allClasses.filter(c => teacher.classIds.includes(c.id));
      const groups = classes.map(c => ({
        classe: c,
        groups: this.groupsService.getGroupsForClasse(c.id),
      }));
      const studentCount = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
      const salary = this.teachersService.getPayrollAmount(teacher, studentCount);
      return { teacher, classes, groups, studentCount, salary };
    });
  });

  totalCount = computed(() => this.teachers().length);
  activeCount = computed(() => this.teachers().filter(t => t.status === 'active').length);
  totalPayroll = computed(() => this.teacherRows().reduce((s, r) => s + r.salary, 0));

  showModal = signal(false);
  editingTeacher = signal<Teacher | null>(null);

  formData: TeacherForm = {
    firstName: '', lastName: '', email: '', phone: '',
    specialty: '', paymentMode: 'fixed',
    fixedSalary: 0, ratePerStudent: 0,
    status: 'active', classIds: [],
  };

  openAdd(): void {
    this.formData = {
      firstName: '', lastName: '', email: '', phone: '', specialty: '',
      paymentMode: 'fixed', fixedSalary: 0, ratePerStudent: 0,
      status: 'active', classIds: [],
    };
    this.editingTeacher.set(null);
    this.showModal.set(true);
  }

  openEdit(t: Teacher): void {
    this.formData = {
      firstName: t.firstName, lastName: t.lastName, email: t.email, phone: t.phone,
      specialty: t.specialty, paymentMode: t.paymentMode,
      fixedSalary: t.fixedSalary ?? 0, ratePerStudent: t.ratePerStudent ?? 0,
      status: t.status, classIds: [...t.classIds],
    };
    this.editingTeacher.set(t);
    this.showModal.set(true);
  }

  submit(): void {
    const editing = this.editingTeacher();
    const payload = {
      ...this.formData,
      fixedSalary: this.formData.paymentMode === 'fixed' ? this.formData.fixedSalary : undefined,
      ratePerStudent: this.formData.paymentMode === 'per_student' ? this.formData.ratePerStudent : undefined,
    };

    if (editing) {
      this.teachersService.update(editing.id, payload).subscribe({
        next: () => {
          this.toast.show('Professeur mis à jour');
          this.showModal.set(false);
        },
        error: () => this.toast.show("Erreur lors de l'enregistrement", 'error'),
      });
    } else {
      this.teachersService.add(payload).subscribe({
        next: () => {
          this.toast.show('Professeur ajouté');
          this.showModal.set(false);
        },
        error: () => this.toast.show("Erreur lors de l'enregistrement", 'error'),
      });
    }
  }

  deleteTeacher(t: Teacher): void {
    if (!confirm(`Supprimer le professeur ${t.firstName} ${t.lastName} ?`)) return;

    this.classesService.classes()
      .filter(c => c.teacherId === t.id)
      .forEach(c => this.classesService.update(c.id, { teacherId: null }).subscribe());

    this.teachersService.delete(t.id).subscribe({
      next: () => this.toast.show('Professeur supprimé', 'info'),
      error: () => this.toast.show('Erreur lors de la suppression', 'error'),
    });
  }

  getInitials(firstName: string, lastName: string): string {
    return (firstName[0] + lastName[0]).toUpperCase();
  }

  formatSalary(amount: number): string {
    return amount.toLocaleString('fr-MA') + ' Dhs';
  }

  getPaymentModeLabel(mode: string): string {
    return mode === 'fixed' ? 'Fixe' : 'Par étudiant';
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }
}
