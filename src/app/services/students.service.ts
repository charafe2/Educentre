import { Injectable, signal, inject } from '@angular/core';
import { Student } from '../models/student.model';
import { ClassesService } from './classes.service';

const AVATAR_COLORS = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2', '#be185d', '#b45309'];

@Injectable({ providedIn: 'root' })
export class StudentsService {
  private classesService = inject(ClassesService);
  private nextId = signal(9);

  students = signal<Student[]>([
    { id: 1, code: 'ETD-001', firstName: 'Youssef', lastName: 'Amrani', birthDate: '2007-03-15', school: 'Lycée Ibn Sina', level: '2ème Bac', enrolledClassIds: [1, 2], paymentStatus: 'paid', status: 'active', avatarColor: '#0d9488', parentName: 'Khalid Amrani', parentPhone: '0661001001', parentWhatsapp: '0661001001', absenceCount: 1, totalSessions: 16, createdAt: '2024-09-01' },
    { id: 2, code: 'ETD-002', firstName: 'Fatima', lastName: 'Benali', birthDate: '2009-06-22', school: 'Collège Al Fath', level: '3ème Collège', enrolledClassIds: [2, 3], paymentStatus: 'pending', status: 'active', avatarColor: '#7c3aed', parentName: 'Aicha Benali', parentPhone: '0662002002', parentWhatsapp: '0662002002', absenceCount: 4, totalSessions: 16, createdAt: '2024-09-03' },
    { id: 3, code: 'ETD-003', firstName: 'Omar', lastName: 'Cherkaoui', birthDate: '2008-11-08', school: 'Lycée Mohammed V', level: '1ère Bac', enrolledClassIds: [5, 6], paymentStatus: 'paid', status: 'active', avatarColor: '#dc2626', parentName: 'Hassan Cherkaoui', parentPhone: '0663003003', parentWhatsapp: '0663003003', absenceCount: 0, totalSessions: 16, createdAt: '2024-09-05' },
    { id: 4, code: 'ETD-004', firstName: 'Nadia', lastName: 'Doukkali', birthDate: '2007-01-30', school: 'Lycée Ibn Sina', level: '2ème Bac', enrolledClassIds: [1, 2], paymentStatus: 'overdue', status: 'active', avatarColor: '#d97706', parentName: 'Fatima Doukkali', parentPhone: '0664004004', parentWhatsapp: '0664004004', absenceCount: 7, totalSessions: 16, createdAt: '2024-09-07' },
    { id: 5, code: 'ETD-005', firstName: 'Karim', lastName: 'El Fassi', birthDate: '2010-04-18', school: 'Collège Hassan II', level: 'Tronc Commun', enrolledClassIds: [4], paymentStatus: 'paid', status: 'inactive', avatarColor: '#059669', parentName: 'Mohamed El Fassi', parentPhone: '0665005005', parentWhatsapp: '0665005005', absenceCount: 2, totalSessions: 16, createdAt: '2024-09-10' },
    { id: 6, code: 'ETD-006', firstName: 'Sara', lastName: 'Ghaoui', birthDate: '2008-08-25', school: 'Lycée Al Khawarizmi', level: '1ère Bac', enrolledClassIds: [3, 5], paymentStatus: 'paid', status: 'active', avatarColor: '#0891b2', parentName: 'Zineb Ghaoui', parentPhone: '0666006006', parentWhatsapp: '0666006006', absenceCount: 0, totalSessions: 16, createdAt: '2024-09-12' },
    { id: 7, code: 'ETD-007', firstName: 'Hamza', lastName: 'Idrissi', birthDate: '2007-12-03', school: 'Lycée Mohammed V', level: '2ème Bac', enrolledClassIds: [1, 2], paymentStatus: 'pending', status: 'active', avatarColor: '#be185d', parentName: 'Rachid Idrissi', parentPhone: '0667007007', parentWhatsapp: '0667007007', absenceCount: 3, totalSessions: 16, createdAt: '2024-09-15' },
    { id: 8, code: 'ETD-008', firstName: 'Leila', lastName: 'Jabri', birthDate: '2009-09-14', school: 'Collège Al Fath', level: '3ème Collège', enrolledClassIds: [3], paymentStatus: 'overdue', status: 'active', avatarColor: '#b45309', parentName: 'Samir Jabri', parentPhone: '0668008008', parentWhatsapp: '0668008008', absenceCount: 5, totalSessions: 16, createdAt: '2024-09-18' },
  ]);

  getById(id: number): Student | undefined {
    return this.students().find(s => s.id === id);
  }

  getEnrolledClasses(studentId: number) {
    const student = this.getById(studentId);
    if (!student) return [];
    return this.classesService.getByIds(student.enrolledClassIds);
  }

  add(data: Omit<Student, 'id' | 'code' | 'avatarColor' | 'absenceCount' | 'totalSessions' | 'createdAt'>): number {
    const id = this.nextId();
    const colorIndex = (id - 1) % AVATAR_COLORS.length;
    const student: Student = {
      ...data,
      id,
      code: `ETD-${String(id).padStart(3, '0')}`,
      avatarColor: AVATAR_COLORS[colorIndex],
      absenceCount: 0,
      totalSessions: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.students.update(list => [...list, student]);
    this.nextId.update(n => n + 1);
    return id;
  }

  update(id: number, data: Partial<Student>): void {
    this.students.update(list => list.map(s => s.id === id ? { ...s, ...data } : s));
  }

  delete(id: number): void {
    const student = this.getById(id);
    if (student) {
      student.enrolledClassIds.forEach(classId => {
        this.classesService.unenrollStudent(classId, id);
      });
    }
    this.students.update(list => list.filter(s => s.id !== id));
  }

  updatePaymentStatus(studentId: number): void {
    // Called externally by PaymentsService — just a signal to re-derive; the logic lives in payments
  }

  setPaymentStatus(studentId: number, status: 'paid' | 'pending' | 'overdue'): void {
    this.students.update(list => list.map(s => s.id === studentId ? { ...s, paymentStatus: status } : s));
  }
}
