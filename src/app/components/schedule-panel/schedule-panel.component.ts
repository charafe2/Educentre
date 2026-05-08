import { Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { SessionsService } from '../../services/sessions.service';
import { ClassesService } from '../../services/classes.service';
import { TeachersService } from '../../services/teachers.service';

const ROOM_NAMES: Record<number, string> = { 1: 'Salle 1', 2: 'Salle 2', 3: 'Salle 3', 4: 'Salle 4' };

const JS_DAY_TO_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };

function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

@Component({
  selector: 'app-schedule-panel',
  imports: [NgClass],
  templateUrl: './schedule-panel.component.html',
  styleUrl: './schedule-panel.component.css'
})
export class SchedulePanelComponent {
  private sessionsService = inject(SessionsService);
  private classesService = inject(ClassesService);
  private teachersService = inject(TeachersService);

  schedule = computed(() => {
    const jsDay = new Date().getDay();
    const todayIndex = JS_DAY_TO_INDEX[jsDay];
    if (todayIndex === undefined) return [];

    const currentHour = new Date().getHours();

    return this.sessionsService.getByDay(todayIndex)
      .filter(s => !s.isCancelled)
      .sort((a, b) => a.startHour - b.startHour)
      .map(session => {
        const classe = this.classesService.getById(session.classeId);
        const teacher = classe ? this.teachersService.getById(classe.teacherId) : undefined;

        let state: 'past' | 'active' | 'upcoming';
        if (currentHour >= session.endHour) state = 'past';
        else if (currentHour >= session.startHour) state = 'active';
        else state = 'upcoming';

        const timeLabel = `${pad(session.startHour)}:00 - ${pad(session.endHour)}:00` +
          (state === 'active' ? ' (En cours)' : '');

        return {
          time: timeLabel,
          title: classe?.name ?? 'Classe inconnue',
          desc: teacher
            ? `Pr. ${teacher.lastName} • ${ROOM_NAMES[classe?.roomId ?? 0] ?? 'Salle ?'}`
            : ROOM_NAMES[classe?.roomId ?? 0] ?? '',
          state,
        };
      });
  });

  get isWeekend(): boolean {
    const d = new Date().getDay();
    return d === 0;
  }
}
