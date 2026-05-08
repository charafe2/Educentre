import { Component, signal, computed, inject } from '@angular/core';
import { NgStyle } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionsService } from '../../services/sessions.service';
import { ClassesService } from '../../services/classes.service';
import { AttendanceService } from '../../services/attendance.service';
import { StudentsService } from '../../services/students.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Session } from '../../models/session.model';
import { Classe } from '../../models/classe.model';
import { AttendanceStatus } from '../../models/attendance.model';

@Component({
  selector: 'app-calendrier',
  imports: [NgStyle, FormsModule, ModalComponent],
  templateUrl: './calendrier.component.html',
  styleUrl: './calendrier.component.css'
})
export class CalendrierComponent {
  private sessionsService = inject(SessionsService);
  private classesService = inject(ClassesService);
  private attendanceService = inject(AttendanceService);
  private studentsService = inject(StudentsService);
  private toast = inject(ToastService);

  weekOffset = signal(0);
  days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  hours = Array.from({ length: 13 }, (_, i) => i + 8);

  sessions = this.sessionsService.sessions;
  classes = this.classesService.classes;

  showAddModal = signal(false);
  editingSession = signal<Session | null>(null);
  showAttendanceModal = signal<Session | null>(null);

  // attendance records for current session
  attendanceMap = signal<Record<number, AttendanceStatus>>({});

  formData = {
    classeId: 0,
    day: 0,
    startHour: 9,
    endHour: 11,
  };

  openAddSession(): void {
    this.formData = { classeId: this.classes()[0]?.id ?? 1, day: 0, startHour: 9, endHour: 11 };
    this.editingSession.set(null);
    this.showAddModal.set(true);
  }

  openEditSession(s: Session): void {
    this.formData = { classeId: s.classeId, day: s.day, startHour: s.startHour, endHour: s.endHour };
    this.editingSession.set(s);
    this.showAddModal.set(true);
  }

  submitSession(): void {
    const editing = this.editingSession();
    if (editing) {
      this.sessionsService.update(editing.id, { ...this.formData });
      this.toast.show('Séance mise à jour');
    } else {
      this.sessionsService.add({ ...this.formData, isCancelled: false });
      this.toast.show('Séance ajoutée');
    }
    this.showAddModal.set(false);
  }

  deleteSession(s: Session): void {
    if (confirm('Supprimer cette séance ?')) {
      this.sessionsService.delete(s.id);
      this.toast.show('Séance supprimée', 'info');
    }
  }

  openAttendance(s: Session): void {
    const records = this.attendanceService.getBySession(s.id);
    const map: Record<number, AttendanceStatus> = {};
    const classe = this.classesService.getById(s.classeId);
    if (classe) {
      classe.enrolledStudentIds.forEach(sid => {
        const r = records.find(r => r.studentId === sid);
        map[sid] = r?.status ?? 'present';
      });
    }
    this.attendanceMap.set(map);
    this.showAttendanceModal.set(s);
  }

  saveAttendance(): void {
    const session = this.showAttendanceModal();
    if (!session) return;
    const map = this.attendanceMap();
    Object.entries(map).forEach(([sid, status]) => {
      this.attendanceService.upsert({
        sessionId: session.id,
        studentId: Number(sid),
        status: status as AttendanceStatus,
      });
    });
    this.toast.show('Présences enregistrées');
    this.showAttendanceModal.set(null);
  }

  setAttendance(studentId: number, status: AttendanceStatus): void {
    this.attendanceMap.update(m => ({ ...m, [studentId]: status }));
  }

  cancelSession(s: Session): void {
    const reason = prompt('Raison de l\'annulation :');
    if (reason !== null) {
      this.sessionsService.cancel(s.id, reason);
      this.showAttendanceModal.set(null);
      this.toast.show('Séance annulée', 'info');
    }
  }

  getClasseForSession(s: Session): Classe | undefined {
    return this.classesService.getById(s.classeId);
  }

  getStudentsForSession(s: Session) {
    const classe = this.getClasseForSession(s);
    if (!classe) return [];
    return classe.enrolledStudentIds.map(id => this.studentsService.getById(id)).filter(Boolean);
  }

  getSessionsForSlot(day: number, hour: number): Session[] {
    return this.sessionsService.getForSlot(day, hour);
  }

  getSessionStyle(session: Session): Record<string, string> {
    const classe = this.getClasseForSession(session);
    const height = (session.endHour - session.startHour) * 60;
    return {
      'background-color': classe?.bgColor ?? '#f1f5f9',
      'border-left': `3px solid ${classe?.color ?? '#94a3b8'}`,
      'color': classe?.color ?? '#64748b',
      'height': `${height}px`,
      'position': 'absolute',
      'left': '2px',
      'right': '2px',
      'top': '0',
      'z-index': '2',
      'border-radius': '4px',
      'padding': '4px 6px',
      'font-size': '0.75rem',
      'overflow': 'hidden',
      'cursor': 'pointer',
      'opacity': session.isCancelled ? '0.5' : '1',
    };
  }

  get todaySessions(): Session[] {
    const today = new Date().getDay();
    const dayMap: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
    const todayIndex = dayMap[today] ?? 0;
    return this.sessions().filter(s => s.day === todayIndex).sort((a, b) => a.startHour - b.startHour);
  }

  get currentWeekLabel(): string {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + this.weekOffset() * 7);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const fmt = (d: Date) => d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' });
    return `${fmt(monday)} – ${fmt(saturday)}`;
  }

  prevWeek() { this.weekOffset.update(v => v - 1); }
  nextWeek() { this.weekOffset.update(v => v + 1); }
  thisWeek() { this.weekOffset.set(0); }
}
