import { Component, inject, computed } from '@angular/core';
import { ParentAuthService } from '../../parent-auth.service';
import { ClassesService } from '../../../services/classes.service';
import { SessionsService } from '../../../services/sessions.service';
import { TeachersService } from '../../../services/teachers.service';
import { Teacher } from '../../../models/teacher.model';
import { Session } from '../../../models/session.model';

@Component({
  selector: 'app-parent-cours',
  standalone: true,
  imports: [],
  templateUrl: './parent-cours.component.html',
  styleUrl: './parent-cours.component.css'
})
export class ParentCoursComponent {
  private auth = inject(ParentAuthService);
  private classesService = inject(ClassesService);
  private sessionsService = inject(SessionsService);
  private teachersService = inject(TeachersService);

  student = this.auth.currentStudent;

  enrolledClasses = computed(() => {
    const s = this.student();
    return s ? this.classesService.getByIds(s.enrolledClassIds) : [];
  });

  getTeacher(teacherId: number): Teacher | undefined {
    return this.teachersService.getById(teacherId);
  }

  getTeacherInitials(teacherId: number): string {
    const t = this.getTeacher(teacherId);
    if (!t) return '?';
    return (t.firstName[0] + t.lastName[0]).toUpperCase();
  }

  getSessionsForClass(classeId: number): Session[] {
    return this.sessionsService.getByClasse(classeId)
      .filter(s => !s.isCancelled)
      .sort((a, b) => a.day - b.day || a.startHour - b.startHour);
  }

  dayName(day: number): string {
    return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][day];
  }

  formatHour(h: number): string {
    return h < 10 ? '0' + h + ':00' : h + ':00';
  }
}
