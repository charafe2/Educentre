import { Injectable, signal } from '@angular/core';
import { Classe } from '../models/classe.model';

@Injectable({ providedIn: 'root' })
export class ClassesService {
  private nextId = signal(7);

  classes = signal<Classe[]>([
    { id: 1, name: 'Maths 2Bac A', subject: 'Mathématiques', level: '2ème Bac', teacherId: 1, roomId: 1, maxCapacity: 15, monthlyPrice: 350, enrolledStudentIds: [1, 4, 7], status: 'active', color: '#1d4ed8', bgColor: '#dbeafe' },
    { id: 2, name: 'Physique 2Bac', subject: 'Physique-Chimie', level: '2ème Bac', teacherId: 2, roomId: 2, maxCapacity: 12, monthlyPrice: 320, enrolledStudentIds: [1, 2, 4, 7], status: 'active', color: '#c2410c', bgColor: '#ffedd5' },
    { id: 3, name: 'Français 3ème', subject: 'Français', level: '3ème Collège', teacherId: 3, roomId: 3, maxCapacity: 18, monthlyPrice: 280, enrolledStudentIds: [2, 6, 8], status: 'active', color: '#166534', bgColor: '#dcfce7' },
    { id: 4, name: 'Arabe TC', subject: 'Arabe', level: 'Tronc Commun', teacherId: 4, roomId: 1, maxCapacity: 20, monthlyPrice: 300, enrolledStudentIds: [5], status: 'active', color: '#0f766e', bgColor: '#ccfbf1' },
    { id: 5, name: 'Anglais 1Bac', subject: 'Anglais', level: '1ère Bac', teacherId: 5, roomId: 4, maxCapacity: 15, monthlyPrice: 310, enrolledStudentIds: [3, 6], status: 'active', color: '#6b21a8', bgColor: '#f3e8ff' },
    { id: 6, name: 'SVT 1Bac', subject: 'SVT', level: '1ère Bac', teacherId: 6, roomId: 3, maxCapacity: 10, monthlyPrice: 290, enrolledStudentIds: [3], status: 'active', color: '#166534', bgColor: '#dcfce7' },
  ]);

  getById(id: number): Classe | undefined {
    return this.classes().find(c => c.id === id);
  }

  getByIds(ids: number[]): Classe[] {
    return this.classes().filter(c => ids.includes(c.id));
  }

  add(data: Omit<Classe, 'id'>): number {
    const id = this.nextId();
    this.classes.update(list => [...list, { ...data, id }]);
    this.nextId.update(n => n + 1);
    return id;
  }

  update(id: number, data: Partial<Classe>): void {
    this.classes.update(list => list.map(c => c.id === id ? { ...c, ...data } : c));
  }

  delete(id: number): void {
    this.classes.update(list => list.filter(c => c.id !== id));
  }

  enrollStudent(classeId: number, studentId: number): void {
    this.classes.update(list => list.map(c =>
      c.id === classeId
        ? { ...c, enrolledStudentIds: [...c.enrolledStudentIds, studentId] }
        : c
    ));
  }

  unenrollStudent(classeId: number, studentId: number): void {
    this.classes.update(list => list.map(c =>
      c.id === classeId
        ? { ...c, enrolledStudentIds: c.enrolledStudentIds.filter(id => id !== studentId) }
        : c
    ));
  }
}
