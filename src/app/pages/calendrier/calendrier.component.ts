import { Component, signal, computed, inject } from '@angular/core';
import { NgStyle, NgClass } from '@angular/common';
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
  imports: [NgStyle, NgClass, FormsModule, ModalComponent],
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

  attendanceMap = signal<Record<number, AttendanceStatus>>({});

  // ── Drag state ──
  draggingId = signal<number | null>(null);
  draggingDuration = signal(0);
  dragOverSlot = signal<{ day: number; hour: number } | null>(null);
  isDragging = signal(false);

  formData = {
    classeId: 0,
    day: 0,
    startHour: 9,
    endHour: 11,
  };

  // ── Session CRUD ──
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

  // ── Attendance ──
  openAttendance(s: Session): void {
    // Do not open attendance while dragging
    if (this.draggingId() !== null) return;
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

  // ── Drag & Drop ──
  onDragStart(event: DragEvent, session: Session): void {
    this.draggingId.set(session.id);
    this.draggingDuration.set(session.endHour - session.startHour);
    this.isDragging.set(true);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', String(session.id));
  }

  onDragEnd(event: DragEvent): void {
    this.draggingId.set(null);
    this.dragOverSlot.set(null);
    this.isDragging.set(false);
  }

  onDragOver(event: DragEvent, day: number, hour: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    const current = this.dragOverSlot();
    if (!current || current.day !== day || current.hour !== hour) {
      this.dragOverSlot.set({ day, hour });
    }
  }

  onDragLeave(event: DragEvent, day: number, hour: number): void {
    // Only clear if we're leaving to outside the cell (not to a child)
    const related = event.relatedTarget as HTMLElement | null;
    const cell = event.currentTarget as HTMLElement;
    if (!related || !cell.contains(related)) {
      const current = this.dragOverSlot();
      if (current?.day === day && current?.hour === hour) {
        this.dragOverSlot.set(null);
      }
    }
  }

  onDrop(event: DragEvent, day: number, hour: number): void {
    event.preventDefault();
    const id = this.draggingId();
    const duration = this.draggingDuration();

    // Reset drag state first — Angular may destroy the source element before
    // dragend fires, which would leave isDragging=true and block future drags.
    this.draggingId.set(null);
    this.dragOverSlot.set(null);
    this.isDragging.set(false);

    if (id === null) return;

    const maxHour = this.hours[this.hours.length - 1] + 1; // 21
    if (hour + duration > maxHour) {
      this.toast.show('Impossible : dépasse la plage horaire', 'info');
      return;
    }

    this.sessionsService.update(id, { day, startHour: hour, endHour: hour + duration });
    this.toast.show('Séance déplacée');
  }

  isDragOver(day: number, hour: number): boolean {
    const slot = this.dragOverSlot();
    return slot?.day === day && slot?.hour === hour;
  }

  // ── Helpers ──
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
      'cursor': 'grab',
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
