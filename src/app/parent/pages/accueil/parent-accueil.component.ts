import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { ParentAuthService } from '../../parent-auth.service';
import { PaymentsService } from '../../../services/payments.service';
import { AttendanceService } from '../../../services/attendance.service';
import { ClassesService } from '../../../services/classes.service';
import { SessionsService } from '../../../services/sessions.service';
import { TeachersService } from '../../../services/teachers.service';
import { Session } from '../../../models/session.model';
import { Classe } from '../../../models/classe.model';

interface NextSessionInfo {
  session: Session;
  classe: Classe;
  teacherName: string;
}

@Component({
  selector: 'app-parent-accueil',
  standalone: true,
  imports: [RouterLink, NgClass],
  templateUrl: './parent-accueil.component.html',
  styleUrl: './parent-accueil.component.css'
})
export class ParentAccueilComponent {
  private auth = inject(ParentAuthService);
  private paymentsService = inject(PaymentsService);
  private attendanceService = inject(AttendanceService);
  private classesService = inject(ClassesService);
  private sessionsService = inject(SessionsService);
  private teachersService = inject(TeachersService);

  student = this.auth.currentStudent;

  enrolledClasses = computed(() => {
    const s = this.student();
    return s ? this.classesService.getByIds(s.enrolledClassIds) : [];
  });

  studentPayments = computed(() => {
    const s = this.student();
    return s ? this.paymentsService.getByStudent(s.id) : [];
  });

  overduePayments = computed(() => this.studentPayments().filter(p => p.status === 'overdue'));

  pendingPayments = computed(() => this.studentPayments().filter(p => p.status === 'pending'));

  nextSession = computed<NextSessionInfo | null>(() => {
    const classes = this.enrolledClasses();
    if (!classes.length) return null;

    const today = new Date();
    // Monday = 0 in our model, but JS Date: Sunday=0, Monday=1...
    const jsDay = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    // Our model: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat
    // Convert: JS Sunday=0 → model day doesn't exist; Mon=1 → model 0
    const todayModelDay = jsDay === 0 ? -1 : jsDay - 1; // -1 means Sunday (no sessions)
    const currentHour = today.getHours();

    const classIds = classes.map(c => c.id);
    const allSessions = this.sessionsService.sessions().filter(
      s => classIds.includes(s.classeId) && !s.isCancelled
    );

    if (!allSessions.length) return null;

    // Score each session: sessions today that haven't ended get priority
    // then future days in the week, then wrap around
    const scoredSessions = allSessions.map(s => {
      let dayDiff = s.day - todayModelDay;
      if (dayDiff < 0) dayDiff += 6; // wrap around week
      if (dayDiff === 0 && s.endHour <= currentHour) {
        dayDiff += 6; // today but already ended, push to next week
      }
      const score = dayDiff * 24 + s.startHour;
      return { session: s, score };
    });

    scoredSessions.sort((a, b) => a.score - b.score);
    const best = scoredSessions[0];
    if (!best) return null;

    const classe = classes.find(c => c.id === best.session.classeId);
    if (!classe) return null;

    const teacher = classe.teacherId !== null ? this.teachersService.getById(classe.teacherId) : undefined;
    const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : '—';

    return { session: best.session, classe, teacherName };
  });

  attendanceRate = computed(() => {
    const s = this.student();
    const records = s ? this.attendanceService.getByStudent(s.id) : [];
    if (!records.length) return 100;
    const positive = records.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round(positive / records.length * 100);
  });

  recentPayments = computed(() =>
    [...this.studentPayments()].sort((a, b) => b.id - a.id).slice(0, 3)
  );

  todayLabel(): string {
    return new Date().toLocaleDateString('fr-MA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getClassName(classeId: number): string {
    return this.classesService.getById(classeId)?.name ?? '—';
  }

  formatMonth(periodMonth: string): string {
    return new Date(periodMonth + '-01').toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' });
  }

  paymentLabel(status: string): string {
    const map: Record<string, string> = { paid: 'Payé', pending: 'En attente', overdue: 'Impayé' };
    return map[status] ?? status;
  }

  paymentClass(status: string): string {
    const map: Record<string, string> = { paid: 'badge-success', pending: 'badge-warning', overdue: 'badge-danger' };
    return map[status] ?? '';
  }

  dayName(day: number): string {
    return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][day];
  }

  formatHour(h: number): string {
    return h < 10 ? '0' + h + ':00' : h + ':00';
  }

  attendanceRateClass(): string {
    const rate = this.attendanceRate();
    if (rate >= 85) return 'rate-good';
    if (rate >= 70) return 'rate-ok';
    return 'rate-bad';
  }
}
