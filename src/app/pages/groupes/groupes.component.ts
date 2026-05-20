import { Component, computed, inject, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupsService } from '../../services/groups.service';
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

interface LevelView {
  level: string;
  subjects: SubjectView[];
  totalStudents: number;
  totalGroups: number;
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
    name: '',
    subject: '',
    level: '',
    monthlyPrice: 0,
    maxCapacity: 0,
    teacherId: 0,
    status: 'active' as 'active' | 'inactive',
  };

  openEditClasse(classe: Classe): void {
    this.editForm = {
      name: classe.name,
      subject: classe.subject,
      level: classe.level,
      monthlyPrice: classe.monthlyPrice,
      maxCapacity: classe.maxCapacity,
      teacherId: classe.teacherId,
      status: classe.status,
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
    });
    this.toast.show('Classe mise à jour');
    this.editingClasse.set(null);
  }

  searchTerm = signal('');

  draggingStudentId = signal<number | null>(null);
  draggingFromGroupId = signal<number | null>(null);
  dragOverGroupId = signal<number | null>(null);
  isDragging = signal(false);

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

  pendingFullDrop = signal<{ studentId: number; fromGroupId: number; toGroupId: number; classeId: number; studentName: string; className: string } | null>(null);

  subjectViews = computed<SubjectView[]>(() => {
    const term = this.searchTerm().toLowerCase();
    return this.classesService.classes()
      .filter(c => !term || c.name.toLowerCase().includes(term) || c.subject.toLowerCase().includes(term) || c.level.toLowerCase().includes(term))
      .map(c => ({
        classe: c,
        groups: this.groupsService.getGroupsForClasse(c.id),
        totalStudents: this.groupsService.getGroupsForClasse(c.id).reduce((s, g) => s + g.studentIds.length, 0),
      }));
  });

  levelViews = computed<LevelView[]>(() => {
    const map = new Map<string, SubjectView[]>();
    for (const v of this.subjectViews()) {
      if (!map.has(v.classe.level)) map.set(v.classe.level, []);
      map.get(v.classe.level)!.push(v);
    }
    return Array.from(map.entries()).map(([level, subjects]) => ({
      level,
      subjects,
      totalStudents: subjects.reduce((s, v) => s + v.totalStudents, 0),
      totalGroups: subjects.reduce((s, v) => s + v.groups.length, 0),
    }));
  });

  collapsedLevels = signal<Set<string>>(new Set());

  toggleLevel(level: string): void {
    this.collapsedLevels.update(set => {
      const next = new Set(set);
      if (next.has(level)) next.delete(level); else next.add(level);
      return next;
    });
  }

  isLevelCollapsed(level: string): boolean {
    return this.collapsedLevels().has(level);
  }

  collapsedSubjects = signal<Set<number>>(new Set());

  toggleSubject(classeId: number, event: Event): void {
    event.stopPropagation();
    this.collapsedSubjects.update(set => {
      const next = new Set(set);
      if (next.has(classeId)) next.delete(classeId); else next.add(classeId);
      return next;
    });
  }

  isSubjectCollapsed(classeId: number): boolean {
    return this.collapsedSubjects().has(classeId);
  }

  // Returns true if this student is already enrolled in any group of the given class
  private isStudentInClasse(studentId: number, classeId: number): boolean {
    return this.groupsService.getGroupsForClasse(classeId).some(g => g.studentIds.includes(studentId));
  }

  canDropInGroup(toGroupId: number): boolean {
    const studentId = this.draggingStudentId();
    const fromGroupId = this.draggingFromGroupId();
    if (studentId === null || fromGroupId === null || fromGroupId === toGroupId) return false;

    const fromClasseId = this.groupsService.getClasseIdForGroup(fromGroupId);
    const toClasseId   = this.groupsService.getClasseIdForGroup(toGroupId);
    if (fromClasseId === undefined || toClasseId === undefined) return false;

    const fromClasse = this.classesService.getById(fromClasseId);
    const toClasse   = this.classesService.getById(toClasseId);
    if (!fromClasse || !toClasse) return false;

    // Block cross-level drops
    if (fromClasse.level !== toClasse.level) return false;

    // Block cross-subject drops when student is already enrolled in target subject
    if (fromClasseId !== toClasseId && this.isStudentInClasse(studentId, toClasseId)) return false;

    return true;
  }

  isBlockedDragTarget(groupId: number): boolean {
    return this.isDragging() && !this.isSameGroup(groupId) && !this.canDropInGroup(groupId);
  }

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
    const valid = this.canDropInGroup(groupId);
    event.dataTransfer!.dropEffect = valid ? 'move' : 'none';
    const next = valid ? groupId : null;
    if (this.dragOverGroupId() !== next) this.dragOverGroupId.set(next);
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

    if (!this.canDropInGroup(toGroupId)) {
      const fromClasseId = this.groupsService.getClasseIdForGroup(fromGroupId);
      const toClasseId   = this.groupsService.getClasseIdForGroup(toGroupId);
      const fromClasse   = fromClasseId ? this.classesService.getById(fromClasseId) : undefined;
      const toClasse     = toClasseId   ? this.classesService.getById(toClasseId)   : undefined;
      if (fromClasse && toClasse && fromClasse.level !== toClasse.level) {
        this.toast.show('Impossible : niveaux différents');
      } else {
        this.toast.show('Élève déjà inscrit dans les deux matières');
      }
      return;
    }

    const result = this.groupsService.moveStudent(studentId, fromGroupId, toGroupId);

    if (result === 'full') {
      const classeId = this.groupsService.getClasseIdForGroup(toGroupId);
      if (classeId === undefined) return;
      const student = this.studentsService.getById(studentId);
      const classe = this.classesService.getById(classeId);
      this.pendingFullDrop.set({
        studentId,
        fromGroupId,
        toGroupId,
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

  addAnyway(): void {
    const pending = this.pendingFullDrop();
    if (!pending) return;
    this.groupsService.forceAddToGroup(pending.studentId, pending.fromGroupId, pending.toGroupId);
    this.toast.show('Élève ajouté');
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
