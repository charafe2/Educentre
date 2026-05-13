import { Component, computed, inject, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupsService } from '../../services/groups.service';
import { ClassesService } from '../../services/classes.service';
import { StudentsService } from '../../services/students.service';
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
  private toast = inject(ToastService);

  searchTerm = signal('');

  // ── Drag state ──
  draggingStudentId = signal<number | null>(null);
  draggingFromGroupId = signal<number | null>(null);
  dragOverGroupId = signal<number | null>(null);
  isDragging = signal(false);

  // ── Capacity editing ──
  editingCapacityGroupId = signal<number | null>(null);
  editingCapacityValue = signal(0);

  startEditCapacity(groupId: number, current: number, event: Event): void {
    event.stopPropagation();
    this.editingCapacityGroupId.set(groupId);
    this.editingCapacityValue.set(current);
  }

  confirmCapacity(groupId: number): void {
    const val = this.editingCapacityValue();
    if (val >= 1) {
      this.groupsService.updateCapacity(groupId, val);
      this.toast.show('Limite mise à jour');
    }
    this.editingCapacityGroupId.set(null);
  }

  cancelCapacity(): void {
    this.editingCapacityGroupId.set(null);
  }

  onCapacityKey(event: KeyboardEvent, groupId: number): void {
    if (event.key === 'Enter') this.confirmCapacity(groupId);
    if (event.key === 'Escape') this.cancelCapacity();
  }

  // ── Full-group confirmation modal ──
  pendingFullDrop = signal<{ studentId: number; fromGroupId: number; classeId: number; studentName: string; className: string } | null>(null);

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
    const students = group.studentIds
      .map(id => this.studentsService.getById(id))
      .filter((s): s is Student => !!s);
    const paid = students.filter(s => s.paymentStatus === 'paid').length * price;
    const total = students.length * price;
    return { paid, total };
  }

  getAbsenceRate(student: Student): number {
    if (student.totalSessions === 0) return 0;
    return Math.round((student.absenceCount / student.totalSessions) * 100);
  }

  absenceClass(student: Student): string {
    const rate = this.getAbsenceRate(student);
    if (rate === 0) return 'absence-none';
    if (rate <= 15) return 'absence-low';
    if (rate <= 30) return 'absence-medium';
    return 'absence-high';
  }

  absenceLabel(student: Student): string {
    const rate = this.getAbsenceRate(student);
    if (student.totalSessions === 0) return '—';
    return `${student.absenceCount}abs`;
  }

  formatMoney(amount: number): string {
    return amount.toLocaleString('fr-MA') + ' dh';
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  // ── Drag & Drop ──
  onDragStart(event: DragEvent, studentId: number, fromGroupId: number): void {
    this.draggingStudentId.set(studentId);
    this.draggingFromGroupId.set(fromGroupId);
    this.isDragging.set(true);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(studentId));
  }

  onDragEnd(): void {
    this.draggingStudentId.set(null);
    this.draggingFromGroupId.set(null);
    this.dragOverGroupId.set(null);
    this.isDragging.set(false);
  }

  onDragOver(event: DragEvent, groupId: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (this.dragOverGroupId() !== groupId) this.dragOverGroupId.set(groupId);
  }

  onDragLeave(event: DragEvent, groupId: number): void {
    const related = event.relatedTarget as HTMLElement | null;
    const cell = event.currentTarget as HTMLElement;
    if (!related || !cell.contains(related)) {
      if (this.dragOverGroupId() === groupId) this.dragOverGroupId.set(null);
    }
  }

  onDrop(event: DragEvent, toGroupId: number): void {
    event.preventDefault();
    const studentId = this.draggingStudentId();
    const fromGroupId = this.draggingFromGroupId();

    this.draggingStudentId.set(null);
    this.draggingFromGroupId.set(null);
    this.dragOverGroupId.set(null);
    this.isDragging.set(false);

    if (studentId === null || fromGroupId === null) return;

    const result = this.groupsService.moveStudent(studentId, fromGroupId, toGroupId);

    if (result === 'full') {
      const classeId = this.groupsService.getClasseIdForGroup(toGroupId);
      if (classeId === undefined) return;
      const student = this.studentsService.getById(studentId);
      const classe = this.classesService.getById(classeId);
      this.pendingFullDrop.set({
        studentId,
        fromGroupId,
        classeId,
        studentName: student ? `${student.firstName} ${student.lastName}` : '—',
        className: classe?.name ?? '—',
      });
    } else if (result === 'ok') {
      this.toast.show('Élève déplacé');
    }
  }

  keepInSameGroup(): void {
    this.pendingFullDrop.set(null);
  }

  confirmCreateNewGroup(): void {
    const pending = this.pendingFullDrop();
    if (!pending) return;
    this.groupsService.createGroupAndMove(pending.studentId, pending.fromGroupId, pending.classeId);
    this.toast.show('Nouveau groupe créé et élève déplacé');
    this.pendingFullDrop.set(null);
  }

  isBeingDragged(studentId: number): boolean {
    return this.draggingStudentId() === studentId;
  }

  isDragTarget(groupId: number): boolean {
    return this.dragOverGroupId() === groupId && this.draggingFromGroupId() !== groupId;
  }

  isSameGroup(groupId: number): boolean {
    return this.draggingFromGroupId() === groupId;
  }
}
