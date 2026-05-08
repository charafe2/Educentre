import { Injectable, signal } from '@angular/core';
import { Session } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private nextId = signal(13);

  sessions = signal<Session[]>([
    { id: 1, classeId: 1, day: 0, startHour: 9, endHour: 11, isCancelled: false },
    { id: 2, classeId: 2, day: 0, startHour: 14, endHour: 16, isCancelled: false },
    { id: 3, classeId: 3, day: 1, startHour: 10, endHour: 12, isCancelled: false },
    { id: 4, classeId: 4, day: 1, startHour: 15, endHour: 17, isCancelled: false },
    { id: 5, classeId: 5, day: 2, startHour: 9, endHour: 11, isCancelled: false },
    { id: 6, classeId: 1, day: 2, startHour: 14, endHour: 16, isCancelled: false },
    { id: 7, classeId: 6, day: 3, startHour: 10, endHour: 12, isCancelled: false },
    { id: 8, classeId: 2, day: 3, startHour: 15, endHour: 17, isCancelled: false },
    { id: 9, classeId: 1, day: 4, startHour: 9, endHour: 11, isCancelled: false },
    { id: 10, classeId: 4, day: 4, startHour: 14, endHour: 16, isCancelled: false },
    { id: 11, classeId: 5, day: 5, startHour: 10, endHour: 12, isCancelled: false },
    { id: 12, classeId: 3, day: 5, startHour: 14, endHour: 16, isCancelled: false },
  ]);

  getByDay(day: number): Session[] {
    return this.sessions().filter(s => s.day === day);
  }

  getByClasse(classeId: number): Session[] {
    return this.sessions().filter(s => s.classeId === classeId);
  }

  getForSlot(day: number, hour: number): Session[] {
    return this.sessions().filter(s => s.day === day && s.startHour === hour);
  }

  add(data: Omit<Session, 'id'>): number {
    const id = this.nextId();
    this.sessions.update(list => [...list, { ...data, id }]);
    this.nextId.update(n => n + 1);
    return id;
  }

  update(id: number, data: Partial<Session>): void {
    this.sessions.update(list => list.map(s => s.id === id ? { ...s, ...data } : s));
  }

  delete(id: number): void {
    this.sessions.update(list => list.filter(s => s.id !== id));
  }

  cancel(id: number, reason: string): void {
    this.sessions.update(list => list.map(s =>
      s.id === id ? { ...s, isCancelled: true, cancelReason: reason } : s
    ));
  }
}
