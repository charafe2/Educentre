import { Component, signal, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Teacher } from '../../models/teacher.model';

@Component({
  selector: 'app-professeurs',
  imports: [NgClass, FormsModule, ModalComponent],
  templateUrl: './professeurs.component.html',
  styleUrl: './professeurs.component.css'
})
export class ProfesseursComponent {
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private toast = inject(ToastService);

  searchTerm = signal('');

  teachers = this.teachersService.teachers;
  classes = this.classesService.classes;

  filteredTeachers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.teachers();
    return this.teachers().filter(t =>
      t.firstName.toLowerCase().includes(term) ||
      t.lastName.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term) ||
      t.specialty.toLowerCase().includes(term)
    );
  });

  totalCount = computed(() => this.teachers().length);
  activeCount = computed(() => this.teachers().filter(t => t.status === 'active').length);

  totalPayroll = computed(() => {
    return this.teachers().reduce((sum, t) => {
      const classes = this.classesService.getByIds(t.classIds);
      const studentCount = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
      return sum + this.teachersService.getPayrollAmount(t, studentCount);
    }, 0);
  });

  showModal = signal(false);
  editingTeacher = signal<Teacher | null>(null);

  formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialty: '',
    paymentMode: 'fixed' as 'fixed' | 'per_student',
    fixedSalary: 0,
    ratePerStudent: 0,
    status: 'active' as 'active' | 'inactive',
    classIds: [] as number[],
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
      firstName: t.firstName, lastName: t.lastName, email: t.email,
      phone: t.phone, specialty: t.specialty,
      paymentMode: t.paymentMode,
      fixedSalary: t.fixedSalary ?? 0, ratePerStudent: t.ratePerStudent ?? 0,
      status: t.status, classIds: [...t.classIds],
    };
    this.editingTeacher.set(t);
    this.showModal.set(true);
  }

  submit(): void {
    const editing = this.editingTeacher();
    const data = {
      ...this.formData,
      fixedSalary: this.formData.paymentMode === 'fixed' ? this.formData.fixedSalary : undefined,
      ratePerStudent: this.formData.paymentMode === 'per_student' ? this.formData.ratePerStudent : undefined,
    };
    if (editing) {
      this.teachersService.update(editing.id, data);
      this.toast.show('Professeur mis à jour');
    } else {
      this.teachersService.add(data);
      this.toast.show('Professeur ajouté');
    }
    this.showModal.set(false);
  }

  deleteTeacher(t: Teacher): void {
    if (confirm(`Supprimer le professeur ${t.firstName} ${t.lastName} ?`)) {
      // set teacherId to 0 on affected classes
      this.classesService.classes().filter(c => c.teacherId === t.id).forEach(c => {
        this.classesService.update(c.id, { teacherId: 0 });
      });
      this.teachersService.delete(t.id);
      this.toast.show('Professeur supprimé', 'info');
    }
  }

  getTeacherClasses(t: Teacher) {
    return this.classesService.getByIds(t.classIds);
  }

  getStudentCount(t: Teacher): number {
    return this.getTeacherClasses(t).reduce((s, c) => s + c.enrolledStudentIds.length, 0);
  }

  getSalary(t: Teacher): number {
    return this.teachersService.getPayrollAmount(t, this.getStudentCount(t));
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
}
