import { Component, computed, inject, signal } from '@angular/core';
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

interface LevelView {
  level: string;
  subjects: SubjectView[];
  totalStudents: number;
  totalGroups: number;
}

@Component({
  selector: 'app-groupes',
  standalone: true,
  imports: [FormsModule],
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
  groupSearchTerm = signal('');
  selectedLevel = signal<string | null>(null);
  selectedClasseId = signal<number | null>(null);

  dragState = signal<{ studentId: number; fromGroupId: number } | null>(null);
  dragOverGroupId = signal<number | null>(null);

  editingCapacityGroupId = signal<number | null>(null);
  editingCapacityValue = signal(0);
  addingToGroupId = signal<number | null>(null);
  studentPickerSearch = signal('');
  allowOverCapacityGroupId = signal<number | null>(null);

  pendingFullAddGroup = signal<{
    groupId: number; groupLabel: string;
  } | null>(null);

  pendingFullDrop = signal<{
    studentId: number; fromGroupId: number; toGroupId: number;
    classeId: number; studentName: string; className: string;
  } | null>(null);

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

  totalLevels = computed(() => this.levelViews().length);
  totalSubjects = computed(() => this.subjectViews().length);
  totalGroups = computed(() => this.levelViews().reduce((sum, level) => sum + level.totalGroups, 0));
  totalStudents = computed(() => this.levelViews().reduce((sum, level) => sum + level.totalStudents, 0));
  fullGroups = computed(() => this.subjectViews().flatMap(view => view.groups).filter(group => this.isGroupFull(group)).length);
  currentLevelView = computed<LevelView | null>(() => {
    const levels = this.levelViews();
    if (levels.length === 0) return null;
    return levels.find(level => level.level === this.selectedLevel()) ?? levels[0];
  });
  currentSubjectView = computed<SubjectView | null>(() => {
    const level = this.currentLevelView();
    if (!level || level.subjects.length === 0) return null;
    return level.subjects.find(subject => subject.classe.id === this.selectedClasseId()) ?? level.subjects[0];
  });
  currentGroups = computed(() => this.currentSubjectView()?.groups ?? []);
  filteredCurrentGroups = computed(() => {
    const term = this.groupSearchTerm().trim().toLowerCase();
    const groups = this.currentGroups();
    if (!term) return groups;

    return groups.filter(group => {
      const groupLabel = `g${group.groupNumber} groupe ${group.groupNumber}`.toLowerCase();
      const students = group.studentIds
        .map(id => this.studentsService.getById(id))
        .filter((student): student is Student => !!student);

      return (
        groupLabel.includes(term) ||
        students.some(student =>
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(term) ||
          student.code.toLowerCase().includes(term)
        )
      );
    });
  });
  currentGroupsFull = computed(() => this.currentGroups().filter(group => this.isGroupFull(group)).length);
  studentPickerContext = computed<{ group: Group; classe: Classe } | null>(() => {
    const groupId = this.addingToGroupId();
    if (groupId === null) return null;

    const group = this.groupsService.groups().find(item => item.id === groupId);
    const classeId = group ? this.groupsService.getClasseIdForGroup(group.id) : undefined;
    const classe = classeId !== undefined ? this.classesService.getById(classeId) : undefined;

    return group && classe ? { group, classe } : null;
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

  private normalizeSubject(subject: string): string {
    return subject.trim().toLowerCase();
  }

  private isSameSubjectAndLevel(fromClasse: Classe, toClasse: Classe): boolean {
    return (
      fromClasse.level === toClasse.level &&
      this.normalizeSubject(fromClasse.subject) === this.normalizeSubject(toClasse.subject)
    );
  }

  canDropInGroup(toGroupId: number): boolean {
    const ds = this.dragState();
    if (!ds || ds.fromGroupId === toGroupId) return false;

    const fromClasseId = this.groupsService.getClasseIdForGroup(ds.fromGroupId);
    const toClasseId   = this.groupsService.getClasseIdForGroup(toGroupId);
    if (fromClasseId === undefined || toClasseId === undefined) return false;

    const fromClasse = this.classesService.getById(fromClasseId);
    const toClasse   = this.classesService.getById(toClasseId);
    if (!fromClasse || !toClasse) return false;

    if (fromClasse.level !== toClasse.level) return false;
    if (this.isSameSubjectAndLevel(fromClasse, toClasse)) return true;
    if (fromClasseId !== toClasseId && this.isStudentInClasse(ds.studentId, toClasseId)) return false;

    return true;
  }

  isBlockedDragTarget(groupId: number): boolean {
    return this.dragState() !== null && !this.isSameGroup(groupId) && !this.canDropInGroup(groupId);
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

  eligibleStudentsForGroup(group: Group, classe: Classe, term = ''): Student[] {
    const normalizedTerm = term.trim().toLowerCase();

    return this.studentsService.students()
      .filter(student =>
        student.status === 'active' &&
        student.level === classe.level &&
        student.enrolledClassIds.includes(classe.id) &&
        !this.isStudentInClasse(student.id, classe.id) &&
        (
          !normalizedTerm ||
          `${student.firstName} ${student.lastName}`.toLowerCase().includes(normalizedTerm) ||
          student.code.toLowerCase().includes(normalizedTerm)
        )
      )
      .sort((first, second) => `${first.firstName} ${first.lastName}`.localeCompare(`${second.firstName} ${second.lastName}`));
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
    this.groupSearchTerm.set('');
    this.selectedLevel.set(null);
    this.selectedClasseId.set(null);
  }

  selectLevel(level: string): void {
    this.selectedLevel.set(level);
    this.selectedClasseId.set(null);
    this.groupSearchTerm.set('');
  }

  selectSubject(classeId: number): void {
    this.selectedClasseId.set(classeId);
    this.groupSearchTerm.set('');
  }

  onGroupSearch(event: Event): void {
    this.groupSearchTerm.set((event.target as HTMLInputElement).value);
  }

  createGroupForCurrentSubject(): void {
    const subject = this.currentSubjectView();
    if (!subject) return;

    const nextGroupNumber = subject.groups.length + 1;
    this.groupsService.createEmptyGroup(subject.classe.id, nextGroupNumber).subscribe({
      next: () => {
        this.groupsService.loadGroups();
        this.toast.show('Nouveau groupe créé');
      },
      error: () => this.toast.show('Erreur lors de la création', 'error'),
    });
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

  openStudentPicker(groupId: number): void {
    const group = this.groupsService.groups().find(item => item.id === groupId);
    if (group && this.isGroupFull(group) && this.allowOverCapacityGroupId() !== groupId) {
      const classe = this.classesService.getById(group.classeId);
      this.pendingFullAddGroup.set({
        groupId,
        groupLabel: `${classe?.subject ?? 'Groupe'} - G${group.groupNumber}`,
      });
      return;
    }

    this.addingToGroupId.set(groupId);
    this.studentPickerSearch.set('');
  }

  closeStudentPicker(): void {
    this.addingToGroupId.set(null);
    this.studentPickerSearch.set('');
    this.allowOverCapacityGroupId.set(null);
  }

  continueFullAdd(): void {
    const pending = this.pendingFullAddGroup();
    if (!pending) return;

    this.pendingFullAddGroup.set(null);
    this.allowOverCapacityGroupId.set(pending.groupId);
    this.addingToGroupId.set(pending.groupId);
    this.studentPickerSearch.set('');
  }

  cancelFullAdd(): void {
    this.pendingFullAddGroup.set(null);
  }

  onStudentPickerSearch(event: Event): void {
    this.studentPickerSearch.set((event.target as HTMLInputElement).value);
  }

  addStudentToGroup(studentId: number, group: Group): void {
    if (group.studentIds.length >= group.maxCapacity && this.allowOverCapacityGroupId() !== group.id) {
      const classe = this.classesService.getById(group.classeId);
      this.pendingFullAddGroup.set({
        groupId: group.id,
        groupLabel: `${classe?.subject ?? 'Groupe'} - G${group.groupNumber}`,
      });
      return;
    }

    this.groupsService.groups.update(list =>
      list.map(item => item.id === group.id ? { ...item, studentIds: [...item.studentIds, studentId] } : item)
    );
    this.groupsService.moveStudent(studentId, null, group.id).subscribe({
      next: () => {
        this.closeStudentPicker();
        this.toast.show('Élève ajouté');
      },
      error: () => {
        this.groupsService.loadGroups();
        this.toast.show('Erreur lors de l\'ajout', 'error');
      },
    });
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

  private swapStudentLocally(studentId: number, fromGroupId: number, toGroupId: number): void {
    this.groupsService.groups.update(list =>
      list.map(g => {
        if (g.id === fromGroupId) return { ...g, studentIds: g.studentIds.filter(id => id !== studentId) };
        if (g.id === toGroupId) {
          return {
            ...g,
            studentIds: g.studentIds.includes(studentId) ? g.studentIds : [...g.studentIds, studentId],
          };
        }
        return g;
      })
    );
  }

  onDrop(event: DragEvent, toGroupId: number): void {
    event.preventDefault();
    const ds = this.dragState();

    if (!ds || ds.fromGroupId === toGroupId) {
      this.dragState.set(null);
      this.dragOverGroupId.set(null);
      return;
    }

    const canDrop = this.canDropInGroup(toGroupId);
    this.dragState.set(null);
    this.dragOverGroupId.set(null);

    if (!canDrop) {
      const fromClasseId = this.groupsService.getClasseIdForGroup(ds.fromGroupId);
      const toClasseId = this.groupsService.getClasseIdForGroup(toGroupId);
      const fromClasse = fromClasseId !== undefined ? this.classesService.getById(fromClasseId) : undefined;
      const toClasse = toClasseId !== undefined ? this.classesService.getById(toClasseId) : undefined;
      if (fromClasse && toClasse && fromClasse.level !== toClasse.level) {
        this.toast.show('Impossible : niveaux différents');
      } else if (fromClasse && toClasse && !this.isSameSubjectAndLevel(fromClasse, toClasse)) {
        this.toast.show('Élève déjà inscrit dans cette matière');
      } else {
        this.toast.show('Déplacement impossible');
      }
      return;
    }

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

  isDragging(): boolean {
    return this.dragState() !== null;
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
