import { Component, inject, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { ParentAuthService } from '../../parent-auth.service';
import { AttendanceService } from '../../../services/attendance.service';
import { SessionsService } from '../../../services/sessions.service';
import { ClassesService } from '../../../services/classes.service';
import { Session } from '../../../models/session.model';
import { Classe } from '../../../models/classe.model';
import { Attendance, AttendanceStatus } from '../../../models/attendance.model';

interface EnrichedRecord {
  record: Attendance;
  session: Session;
  classe: Classe;
}

@Component({
  selector: 'app-parent-presence',
  standalone: true,
  imports: [NgClass],
  templateUrl: './parent-presence.component.html',
  styleUrl: './parent-presence.component.css'
})
export class ParentPresenceComponent {
  private auth = inject(ParentAuthService);
  private attendanceService = inject(AttendanceService);
  private sessionsService = inject(SessionsService);
  private classesService = inject(ClassesService);

  student = this.auth.currentStudent;

  records = computed(() => {
    const s = this.student();
    return s ? this.attendanceService.getByStudent(s.id) : [];
  });

  attendanceRate = computed(() => {
    const r = this.records();
    if (!r.length) return 100;
    return Math.round(r.filter(x => x.status === 'present' || x.status === 'late').length / r.length * 100);
  });

  enrichedRecords = computed<EnrichedRecord[]>(() => {
    return this.records()
      .map(record => {
        const session = this.sessionsService.sessions().find(s => s.id === record.sessionId);
        if (!session) return null;
        const classe = this.classesService.getById(session.classeId);
        if (!classe) return null;
        return { record, session, classe };
      })
      .filter((x): x is EnrichedRecord => x !== null);
  });

  groupedByClass = computed(() => {
    const map = new Map<number, { classe: Classe; records: EnrichedRecord[] }>();
    this.enrichedRecords().forEach(er => {
      const existing = map.get(er.classe.id);
      if (existing) {
        existing.records.push(er);
      } else {
        map.set(er.classe.id, { classe: er.classe, records: [er] });
      }
    });
    return Array.from(map.values());
  });

  countsByStatus = computed(() => {
    const r = this.records();
    return {
      present: r.filter(x => x.status === 'present').length,
      absent:  r.filter(x => x.status === 'absent').length,
      late:    r.filter(x => x.status === 'late').length,
      excused: r.filter(x => x.status === 'excused').length,
    };
  });

  rateColor = computed(() => {
    const rate = this.attendanceRate();
    if (rate >= 85) return 'var(--success)';
    if (rate >= 70) return 'var(--warning)';
    return 'var(--danger)';
  });

  rateGradient = computed(() => {
    const rate = this.attendanceRate();
    const color = this.rateColor();
    return `conic-gradient(${color} 0% ${rate}%, var(--border-dark) ${rate}% 100%)`;
  });

  statusLabel(s: AttendanceStatus): string {
    return { present: 'Présent', absent: 'Absent', late: 'En retard', excused: 'Excusé' }[s];
  }

  statusIcon(s: AttendanceStatus): string {
    return { present: 'fa-check', absent: 'fa-xmark', late: 'fa-clock', excused: 'fa-circle-exclamation' }[s];
  }

  statusClass(s: AttendanceStatus): string {
    return { present: 'status-present', absent: 'status-absent', late: 'status-late', excused: 'status-excused' }[s];
  }

  dayName(day: number): string {
    return ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][day];
  }

  formatHour(h: number): string {
    return h < 10 ? '0' + h + ':00' : h + ':00';
  }
}
