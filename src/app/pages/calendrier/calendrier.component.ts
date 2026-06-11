import { Component, computed, signal, inject } from "@angular/core";
import { NgStyle } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SessionsService } from "../../services/sessions.service";
import { ClassesService } from "../../services/classes.service";
import { AttendanceService } from "../../services/attendance.service";
import { StudentsService } from "../../services/students.service";
import { ToastService } from "../../services/toast.service";
import { ModalComponent } from "../../components/modal/modal.component";
import { Session } from "../../models/session.model";
import { Classe } from "../../models/classe.model";
import { AttendanceStatus } from "../../models/attendance.model";

@Component({
  selector: "app-calendrier",
  imports: [NgStyle, FormsModule, ModalComponent],
  templateUrl: "./calendrier.component.html",
  styleUrl: "./calendrier.component.css"
})
export class CalendrierComponent {
  private sessionsService = inject(SessionsService);
  private classesService = inject(ClassesService);
  private attendanceService = inject(AttendanceService);
  private studentsService = inject(StudentsService);
  private toast = inject(ToastService);

  weekOffset = signal(0);
  days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  private readonly workHoursStorageKey = "moujtahid.calendar.workHours";
  workStartHour = signal(8);
  workEndHour = signal(21);
  hours = computed(() => this.hourRange(this.workStartHour(), this.workEndHour() - 1));
  workStartOptions = computed(() => this.hourRange(0, this.workEndHour() - 1));
  workEndOptions = computed(() => this.hourRange(this.workStartHour() + 1, 23));
  sessionStartOptions = computed(() => this.hourRange(this.workStartHour(), this.workEndHour() - 1));

  sessions = this.sessionsService.sessions;
  classes = this.classesService.classes;

  showAddModal = signal(false);
  editingSession = signal<Session | null>(null);
  showAttendanceModal = signal<Session | null>(null);

  isSavingSession = signal(false);
  isLoadingAttendance = signal(false);
  isSavingAttendance = signal(false);
  attendanceMap = signal<Record<number, AttendanceStatus>>({});

  // Drag state
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

  constructor() {
    this.loadWorkHours();
  }

  // Session CRUD
  openAddSession(): void {
    const startHour = Math.max(this.workStartHour(), Math.min(9, this.workEndHour() - 1));
    this.formData = {
      classeId: this.classes()[0]?.id ?? 1,
      day: 0,
      startHour,
      endHour: Math.min(startHour + 2, this.workEndHour()),
    };
    this.editingSession.set(null);
    this.showAddModal.set(true);
  }

  openEditSession(s: Session): void {
    this.formData = { classeId: s.classeId, day: s.day, startHour: s.startHour, endHour: s.endHour };
    this.editingSession.set(s);
    this.showAddModal.set(true);
  }

  submitSession(): void {
    if (this.formData.endHour <= this.formData.startHour) {
      this.toast.show("L heure de fin doit etre apres l heure de debut", "info");
      return;
    }

    if (this.formData.startHour < this.workStartHour() || this.formData.endHour > this.workEndHour()) {
      this.toast.show("La séance doit rester dans la plage horaire du calendrier", "info");
      return;
    }

    const editing = this.editingSession();
    this.isSavingSession.set(true);

    const request = editing
      ? this.sessionsService.update(editing.id, { ...this.formData })
      : this.sessionsService.add({ ...this.formData, isCancelled: false });

    request.subscribe({
      next: () => {
        this.toast.show(editing ? "Séance mise à jour" : "Séance ajoutée");
        this.showAddModal.set(false);
      },
      error: () => { this.toast.show("Impossible d enregistrer la séance", "info"); this.isSavingSession.set(false); },
      complete: () => this.isSavingSession.set(false),
    });
  }

  deleteSession(s: Session): void {
    if (!confirm("Supprimer cette séance ?")) return;

    this.isSavingSession.set(true);
    this.sessionsService.delete(s.id).subscribe({
      next: () => {
        this.toast.show("Séance supprimée", "info");
        this.showAddModal.set(false);
      },
      error: () => { this.toast.show("Impossible de supprimer la séance", "info"); this.isSavingSession.set(false); },
      complete: () => this.isSavingSession.set(false),
    });
  }

  // Attendance
  openAttendance(s: Session): void {
    if (this.draggingId() !== null) return;

    this.showAttendanceModal.set(s);
    this.isLoadingAttendance.set(true);
    this.attendanceService.loadBySession(s.id).subscribe({
      next: res => {
        const map: Record<number, AttendanceStatus> = {};
        const classe = this.classesService.getById(s.classeId);
        if (classe) {
          classe.enrolledStudentIds.forEach(sid => {
            const record = res.data.find(r => r.studentId === sid);
            map[sid] = record?.status ?? "present";
          });
        }
        this.attendanceMap.set(map);
      },
      error: () => {
        this.toast.show("Impossible de charger les présences", "info");
        this.showAttendanceModal.set(null);
        this.isLoadingAttendance.set(false);
      },
      complete: () => this.isLoadingAttendance.set(false),
    });
  }

  saveAttendance(): void {
    const session = this.showAttendanceModal();
    if (!session) return;

    const records = Object.entries(this.attendanceMap()).map(([sid, status]) => ({
      studentId: Number(sid),
      status: status as AttendanceStatus,
    }));

    this.isSavingAttendance.set(true);
    this.attendanceService.saveForSession(session.id, records).subscribe({
      next: () => {
        this.toast.show("Présences enregistrées");
        this.showAttendanceModal.set(null);
      },
      error: () => { this.toast.show("Impossible d enregistrer les présences", "info"); this.isSavingAttendance.set(false); },
      complete: () => this.isSavingAttendance.set(false),
    });
  }

  setAttendance(studentId: number, status: AttendanceStatus): void {
    this.attendanceMap.update(m => ({ ...m, [studentId]: status }));
  }

  cancelSession(s: Session): void {
    const reason = prompt("Raison de l annulation :");
    if (reason === null) return;

    this.isSavingSession.set(true);
    this.sessionsService.cancel(s.id, reason).subscribe({
      next: () => {
        this.showAttendanceModal.set(null);
        this.toast.show("Séance annulée", "info");
      },
      error: () => { this.toast.show("Impossible d annuler la séance", "info"); this.isSavingSession.set(false); },
      complete: () => this.isSavingSession.set(false),
    });
  }

  // Drag & Drop
  onDragStart(event: DragEvent, session: Session): void {
    this.draggingId.set(session.id);
    this.draggingDuration.set(session.endHour - session.startHour);
    this.isDragging.set(true);
    event.dataTransfer!.effectAllowed = "move";
    event.dataTransfer!.setData("text/plain", String(session.id));
  }

  onDragEnd(event: DragEvent): void {
    this.draggingId.set(null);
    this.dragOverSlot.set(null);
    this.isDragging.set(false);
  }

  onDragOver(event: DragEvent, day: number, hour: number): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = "move";
    const current = this.dragOverSlot();
    if (!current || current.day !== day || current.hour !== hour) {
      this.dragOverSlot.set({ day, hour });
    }
  }

  onDragLeave(event: DragEvent, day: number, hour: number): void {
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

    this.draggingId.set(null);
    this.dragOverSlot.set(null);
    this.isDragging.set(false);

    if (id === null) return;

    const maxHour = this.workEndHour();
    if (hour + duration > maxHour) {
      this.toast.show("Impossible : dépasse la plage horaire", "info");
      return;
    }

    this.sessionsService.update(id, { day, startHour: hour, endHour: hour + duration }).subscribe({
      next: () => this.toast.show("Séance déplacée"),
      error: () => this.toast.show("Impossible de déplacer la séance", "info"),
    });
  }

  isDragOver(day: number, hour: number): boolean {
    const slot = this.dragOverSlot();
    return slot?.day === day && slot?.hour === hour;
  }

  // Helpers
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

  onWorkStartChange(value: string | number): void {
    const start = Number(value);
    const end = Math.max(start + 1, this.workEndHour());
    this.setWorkHours(start, end);
  }

  onWorkEndChange(value: string | number): void {
    const end = Number(value);
    const start = Math.min(this.workStartHour(), end - 1);
    this.setWorkHours(start, end);
  }

  onSessionStartChange(value: string | number): void {
    const startHour = Number(value);
    this.formData.startHour = startHour;
    if (this.formData.endHour <= startHour) {
      this.formData.endHour = Math.min(startHour + 1, this.workEndHour());
    }
  }

  onSessionEndChange(value: string | number): void {
    this.formData.endHour = Number(value);
  }

  sessionEndOptions(): number[] {
    return this.hourRange(this.formData.startHour + 1, this.workEndHour());
  }

  getSessionStyle(session: Session): Record<string, string> {
    const classe = this.getClasseForSession(session);
    const height = (session.endHour - session.startHour) * 60;
    return {
      "background-color": classe?.bgColor ?? "#f1f5f9",
      "border-left": `3px solid ${classe?.color ?? "#94a3b8"}`,
      "color": classe?.color ?? "#64748b",
      "height": `${height}px`,
      "position": "absolute",
      "left": "2px",
      "right": "2px",
      "top": "0",
      "z-index": "2",
      "border-radius": "4px",
      "padding": "4px 6px",
      "font-size": "0.75rem",
      "overflow": "hidden",
      "cursor": "grab",
      "opacity": session.isCancelled ? "0.5" : "1",
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
    const fmt = (d: Date) => d.toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
    return `${fmt(monday)} - ${fmt(saturday)}`;
  }

  prevWeek() { this.weekOffset.update(v => v - 1); }
  nextWeek() { this.weekOffset.update(v => v + 1); }
  thisWeek() { this.weekOffset.set(0); }

  private setWorkHours(start: number, end: number): void {
    const normalizedStart = this.clampHour(start, 0, 22);
    const normalizedEnd = this.clampHour(end, normalizedStart + 1, 23);

    this.workStartHour.set(normalizedStart);
    this.workEndHour.set(normalizedEnd);
    this.persistWorkHours();

    if (this.showAddModal()) {
      this.formData.startHour = this.clampHour(this.formData.startHour, normalizedStart, normalizedEnd - 1);
      this.formData.endHour = this.clampHour(this.formData.endHour, this.formData.startHour + 1, normalizedEnd);
    }
  }

  private loadWorkHours(): void {
    const stored = localStorage.getItem(this.workHoursStorageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { start?: number; end?: number };
      if (typeof parsed.start === "number" && typeof parsed.end === "number") {
        this.setWorkHours(parsed.start, parsed.end);
      }
    } catch {
      localStorage.removeItem(this.workHoursStorageKey);
    }
  }

  private persistWorkHours(): void {
    localStorage.setItem(this.workHoursStorageKey, JSON.stringify({
      start: this.workStartHour(),
      end: this.workEndHour(),
    }));
  }

  private hourRange(start: number, end: number): number[] {
    if (end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  private clampHour(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.trunc(value)));
  }
}
