import { Injectable, signal } from '@angular/core';
import { Teacher } from '../models/teacher.model';

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2', '#be185d', '#b45309'];

@Injectable({ providedIn: 'root' })
export class TeachersService {
  private nextId = signal(7);

  teachers = signal<Teacher[]>([
    { id: 1, firstName: 'Rachid', lastName: 'Mansouri', email: 'r.mansouri@centre.ma', phone: '0661001001', specialty: 'Mathématiques', paymentMode: 'fixed', fixedSalary: 3500, classIds: [1], status: 'active', avatarColor: '#0d9488' },
    { id: 2, firstName: 'Samira', lastName: 'Bouazza', email: 's.bouazza@centre.ma', phone: '0662002002', specialty: 'Physique-Chimie', paymentMode: 'per_student', ratePerStudent: 60, classIds: [2], status: 'active', avatarColor: '#7c3aed' },
    { id: 3, firstName: 'Hassan', lastName: 'Rifai', email: 'h.rifai@centre.ma', phone: '0663003003', specialty: 'Français', paymentMode: 'per_student', ratePerStudent: 55, classIds: [3], status: 'active', avatarColor: '#dc2626' },
    { id: 4, firstName: 'Abdellah', lastName: 'Tazi', email: 'a.tazi@centre.ma', phone: '0664004004', specialty: 'Arabe', paymentMode: 'fixed', fixedSalary: 2800, classIds: [4], status: 'active', avatarColor: '#d97706' },
    { id: 5, firstName: 'Mourad', lastName: 'Alaoui', email: 'm.alaoui@centre.ma', phone: '0665005005', specialty: 'Anglais', paymentMode: 'fixed', fixedSalary: 3200, classIds: [5], status: 'active', avatarColor: '#059669' },
    { id: 6, firstName: 'Zineb', lastName: 'Chraibi', email: 'z.chraibi@centre.ma', phone: '0666006006', specialty: 'SVT', paymentMode: 'per_student', ratePerStudent: 65, classIds: [6], status: 'inactive', avatarColor: '#be185d' },
  ]);

  getById(id: number): Teacher | undefined {
    return this.teachers().find(t => t.id === id);
  }

  add(data: Omit<Teacher, 'id' | 'avatarColor'>): number {
    const id = this.nextId();
    const colorIndex = (id - 1) % AVATAR_COLORS.length;
    const teacher: Teacher = { ...data, id, avatarColor: AVATAR_COLORS[colorIndex] };
    this.teachers.update(list => [...list, teacher]);
    this.nextId.update(n => n + 1);
    return id;
  }

  update(id: number, data: Partial<Teacher>): void {
    this.teachers.update(list => list.map(t => t.id === id ? { ...t, ...data } : t));
  }

  delete(id: number): void {
    this.teachers.update(list => list.filter(t => t.id !== id));
  }

  getPayrollAmount(teacher: Teacher, studentCount: number): number {
    if (teacher.paymentMode === 'fixed') {
      return teacher.fixedSalary ?? 0;
    }
    return (teacher.ratePerStudent ?? 0) * studentCount;
  }
}
