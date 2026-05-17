import { Component, computed, inject, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupsService, DEFAULT_CAPACITY } from '../../services/groups.service';
import { ClassesService } from '../../services/classes.service';
import { StudentsService } from '../../services/students.service';
import { TeachersService } from '../../services/teachers.service';
import { ToastService } from '../../services/toast.service';
import { Group } from '../../models/group.model';
import { Classe } from '../../models/classe.model';
import { Student } from '../../models/student.model';

interface SubjectView {
  classe: Classe;
  groups: Group[];
  totalStudents: number;
}

@Component({
  selector: 'app-groupes',
  standalone: true,
  imports: [NgClass, NgStyle, FormsModule],
  templateUrl: './groupes.component.html',
  styleUrl: './groupes.component.css',
})
export class GroupesComponent {
  private groupsService = inject(GroupsService);
  private classesService = inject(ClassesService);
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private toast = inject(ToastService);

  allTeachers = this.teachersService.teachers;

  editingClasse = signal<Classe | null>(null);
  editForm = {
    name: '', subject: '', level: '',
    monthlyPrice: 0, maxCapacity: 0, teacherId: 0,
    status: 'active' as 'active' | 'inactive',
  };

  openEditClasse(classe: Classe): void {
    this.editForm = {
      name: classe.name, subject: classe.subject, level: classe.level,
      monthlyPrice: classe.monthlyPrice, maxCapacity: classe.maxCapacity,
      teacherId: classe.teacherId ?? 0, status: classe.status,
    };
    this.editingClasse.set(classe);
  }

  closeEditClasse(): void {
    this.editingClasse.set(null);
  }

  saveEditClasse(): void {
    const ec = this.editingClasse();
    if (!ec) return;
    this.classesService.update(ec.id, {
      name: this.editForm.name.trim() || ec.name,
      subject: this.editForm.subject.trim() || ec.subject,
      level: this.editForm.level.trim() || ec.level,
      monthlyPrice: +this.editForm.monthlyPrice,
      maxCapacity: +this.editForm.maxCapacity,
      teacherId: +this.editForm.teacherId,
      status: this.editForm.status,
    }).subscribe(() => {
      this.toast.show('Classe mise à jour');
      this.editingClasse.set(null);
    });
  }

  searchTerm = signal('');

  dragState = signal<{ studentId: number; fromGroupId: number } | null>(null);
  dragOverGroupId = signal<number | null>(null);

  editingCapacityGroupId = signal<number | null>(null);
  editingCapacityValue = signal(0);

  pendingFullDrop = signal<{
    studentId: number; fromGroupId: number; toGroupId: number;
    classeId: number; studentName: string; className: string;
  } | null>(null);

  subjectViews = computed<SubjectView[]>(() => {
    const term = this.searchTerm().toLowerCase();
    return this.classesService.classes()
      .filter(c => !term || c.name.toLowerCase().includes(term) || c.subject.toLowerCase().includes(term))
      .map(c => ({
        classe: c,
        groups: this.groupsService.getGroupsForClasse(c.id),
        totalStudents: this.groupsService.getGroupsForClasse(c.id).reduce((s, g) => s + g.studentIds.length, 0),
      }));
  });

  getStudent(id: number): Student | undefined {
    return this.studentsService.getById(id);
  }

  getInitials(s: Student): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  isGroupFull(group: Group): boolean {
    return group.studentIds.length >= group.maxCapacity;
  }

  getGroupPaymentStats(group: Group, classe: Classe): { paid: number; total: number } {
    const price = classe.monthlyPrice;
    const students = group.studentIds.map(id => this.studentsService.getById(id)).filter((s): s is Student => !!s);
    const paid = students.filter(s => s.paymentStatus === 'paid').length * price;
    const total = students.length * price;
    return { paid, total };
  }

  getAbsenceRate(student: Student): number {
    return student.totalSessions === 0 ? 0 : Math.round((student.absenceCount / student.totalSessions) * 100);
  }

  absenceClass(student: Student): string {
    const rate = this.getAbsenceRate(student);
    if (rate === 0) return 'absence-none';
    if (rate <= 15) return 'absence-low';
    if (rate <= 30) return 'absence-medium';
    return 'absence-high';
  }

  absenceLabel(student: Student): string {
    return student.totalSessions === 0 ? '—' : `${student.absenceCount}abs`;
  }

  formatMoney(amount: number): string {
    return amount.toLocaleString('fr-MA') + ' dh';
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  startEditCapacity(groupId: number, current: number, event: Event): void {
    event.stopPropagation();
    this.editingCapacityGroupId.set(groupId);
    this.editingCapacityValue.set(current);
  }

  confirmCapacity(groupId: number): void {
    const val = this.editingCapacityValue();
    if (val < 1) { this.editingCapacityGroupId.set(null); return; }
    this.groupsService.groups.update(list =>
      list.map(g => g.id === groupId ? { ...g, maxCapacity: val } : g)
    );
    this.groupsService.updateCapacity(groupId, val).subscribe({
      error: () => this.groupsService.loadGroups(),
    });
    this.toast.show('Limite mise à jour');
    this.editingCapacityGroupId.set(null);
  }

  cancelCapacity(): void {
    this.editingCapacityGroupId.set(null);
  }

  onCapacityKey(event: KeyboardEvent, groupId: number): void {
    if (event.key === 'Enter') this.confirmCapacity(groupId);
    if (event.key === 'Escape') this.cancelCapacity();
  }

  /* ── Drag & Drop ── */

  onDragStart(event: DragEvent, studentId: number, fromGroupId: number): void {
    this.dragState.set({ studentId, fromGroupId });
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(studentId));
  }

  onDragEnd(): void {
    this.dragState.set(null);
    this.dragOverGroupId.set(null);
  }

  onDragOver(event: DragEvent, groupId: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverGroupId.set(groupId);
  }

  onDragLeave(event: DragEvent, groupId: number): void {
    const related = event.relatedTarget as HTMLElement | null;
    const cell = event.currentTarget as HTMLElement;
    if (!related || !cell.contains(related)) {
      if (this.dragOverGroupId() === groupId) this.dragOverGroupId.set(null);
    }
  }

  private swapStudentLocally(studentId: number, fromGroupId: number, toGroupId: number): void {
    this.groupsService.groups.update(list =>
      list.map(g => {
        if (g.id === fromGroupId) return { ...g, studentIds: g.studentIds.filter(id => id !== studentId) };
        if (g.id === toGroupId) return { ...g, studentIds: [...g.studentIds, studentId] };
        return g;
      })
    );
  }

  onDrop(event: DragEvent, toGroupId: number): void {
    event.preventDefault();
    const ds = this.dragState();
    this.dragState.set(null);
    this.dragOverGroupId.set(null);

    if (!ds || ds.fromGroupId === toGroupId) return;

    const toGroup = this.groupsService.groups().find(g => g.id === toGroupId);
    if (!toGroup) return;

    if (toGroup.studentIds.length >= toGroup.maxCapacity) {
      const classeId = this.groupsService.getClasseIdForGroup(toGroupId);
      if (classeId === undefined) return;
      const student = this.studentsService.getById(ds.studentId);
      const classe = this.classesService.getById(classeId);
      this.pendingFullDrop.set({
        studentId: ds.studentId, fromGroupId: ds.fromGroupId, toGroupId,
        classeId, studentName: student ? `${student.firstName} ${student.lastName}` : '—',
        className: classe?.name ?? '—',
      });
      return;
    }

    this.swapStudentLocally(ds.studentId, ds.fromGroupId, toGroupId);
    this.groupsService.moveStudent(ds.studentId, ds.fromGroupId, toGroupId).subscribe({
      next: () => this.toast.show('Élève déplacé'),
      error: () => {
        this.groupsService.loadGroups();
        this.toast.show('Erreur lors du déplacement', 'error');
      },
    });
  }

  keepInSameGroup(): void {
    this.pendingFullDrop.set(null);
  }

  addAnyway(): void {
    const pending = this.pendingFullDrop();
    if (!pending) return;

    this.swapStudentLocally(pending.studentId, pending.fromGroupId, pending.toGroupId);
    this.groupsService.moveStudent(pending.studentId, pending.fromGroupId, pending.toGroupId).subscribe({
      next: () => {
        this.toast.show('Élève ajouté');
        this.pendingFullDrop.set(null);
      },
      error: () => {
        this.groupsService.loadGroups();
        this.toast.show('Erreur lors de l\'ajout', 'error');
      },
    });
  }

  confirmCreateNewGroup(): void {
    const pending = this.pendingFullDrop();
    if (!pending) return;

    const groups = this.groupsService.getGroupsForClasse(pending.classeId);
    const nextGroupNumber = groups.length + 1;

    this.groupsService.createGroup(pending.classeId, nextGroupNumber, pending.studentId).subscribe({
      next: (res) => {
        this.groupsService.loadGroups();
        this.toast.show('Nouveau groupe créé et élève déplacé');
        this.pendingFullDrop.set(null);
      },
      error: () => this.toast.show('Erreur lors de la création', 'error'),
    });
  }

  isBeingDragged(studentId: number): boolean {
    return this.dragState()?.studentId === studentId;
  }

  isDragTarget(groupId: number): boolean {
    const ds = this.dragState();
    return this.dragOverGroupId() === groupId && ds?.fromGroupId !== groupId;
  }

  isSameGroup(groupId: number): boolean {
    return this.dragState()?.fromGroupId === groupId;
  }
}
