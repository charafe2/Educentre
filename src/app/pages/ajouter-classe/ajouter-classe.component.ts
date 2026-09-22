import { Component, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClassesService } from '../../services/classes.service';
import { SubjectsService } from '../../services/subjects.service';
import { TeachersService } from '../../services/teachers.service';
import { AcademicLevelsService } from '../../services/academic-levels.service';
import { GroupsService, DEFAULT_CAPACITY } from '../../services/groups.service';
import { ToastService } from '../../services/toast.service';
import { Classe } from '../../models/classe.model';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-ajouter-classe',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './ajouter-classe.component.html',
  styleUrl: './ajouter-classe.component.css',
})
export class AjouterClasseComponent {
  private classesService = inject(ClassesService);
  private subjectsService = inject(SubjectsService);
  private teachersService = inject(TeachersService);
  private academicLevelsService = inject(AcademicLevelsService);
  private groupsService = inject(GroupsService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  allSubjects = this.subjectsService.subjects;
  allTeachers = this.teachersService.teachers;
  allLevels = this.academicLevelsService.levels;

  colorPresets = [
    { color: '#1d4ed8', bgColor: '#dbeafe' },
    { color: '#c2410c', bgColor: '#ffedd5' },
    { color: '#166534', bgColor: '#dcfce7' },
    { color: '#0f766e', bgColor: '#ccfbf1' },
    { color: '#6b21a8', bgColor: '#f3e8ff' },
    { color: '#be185d', bgColor: '#fce7f3' },
    { color: '#b45309', bgColor: '#fef3c7' },
    { color: '#0369a1', bgColor: '#e0f2fe' },
  ];

  classesByLevel = computed(() => {
    const map = new Map<string, Classe[]>();
    for (const c of this.classesService.classes()) {
      if (!map.has(c.level)) map.set(c.level, []);
      map.get(c.level)!.push(c);
    }
    return Array.from(map.entries()).map(([level, classes]) => ({ level, classes }));
  });

  saving = signal(false);

  classeForm = {
    name: '', subject: '', level: '', teacherId: null as number | null,
    maxCapacity: null as number | null, monthlyPrice: null as number | null,
    status: 'active' as 'active' | 'inactive',
    color: '#1d4ed8', bgColor: '#dbeafe',
  };

  selectColor(preset: { color: string; bgColor: string }): void {
    this.classeForm.color = preset.color;
    this.classeForm.bgColor = preset.bgColor;
  }

  private resetForm(): void {
    this.classeForm = {
      name: '', subject: '', level: '', teacherId: null,
      maxCapacity: null, monthlyPrice: null,
      status: 'active', color: '#1d4ed8', bgColor: '#dbeafe',
    };
  }

  submit(): void {
    const f = this.classeForm;
    if (!f.name.trim() || !f.subject.trim() || !f.level.trim() || !f.teacherId
      || !f.maxCapacity || !f.monthlyPrice) {
      this.toast.show(this.t('settings.toastRequiredFields'));
      return;
    }
    const maxCapacity = +f.maxCapacity;
    const monthlyPrice = +f.monthlyPrice;
    this.saving.set(true);
    this.classesService.add({
      name: f.name.trim(), subject: f.subject.trim(), level: f.level.trim(),
      teacherId: f.teacherId, roomId: null, maxCapacity,
      monthlyPrice, status: f.status,
      color: f.color, bgColor: f.bgColor, enrolledStudentIds: [],
    }).subscribe((res: any) => {
      const newId = res?.data?.id ?? res?.id ?? Date.now();
      this.groupsService.groups.update(list => [
        ...list,
        { id: Date.now(), classeId: newId, groupNumber: 1, studentIds: [], maxCapacity: DEFAULT_CAPACITY },
      ]);
      this.toast.show(this.t('settings.toastClassAdded'));
      this.saving.set(false);
      this.resetForm();
    });
  }

  getTeacherName(id: number | null): string {
    if (id === null) return '-';
    const t = this.allTeachers().find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : '-';
  }

  // ── Ajouter un niveau ────────────────────────────────────────
  newLevelName = signal('');
  addingLevel = signal(false);

  addLevel(): void {
    const name = this.newLevelName().trim();
    if (!name) return;

    this.addingLevel.set(true);
    this.academicLevelsService.add(name).subscribe({
      next: () => {
        this.toast.show(this.t('classes.toastLevelAdded'));
        this.newLevelName.set('');
        this.addingLevel.set(false);
      },
      error: () => {
        this.toast.show(this.t('settings.saveError'), 'error');
        this.addingLevel.set(false);
      },
    });
  }
}
