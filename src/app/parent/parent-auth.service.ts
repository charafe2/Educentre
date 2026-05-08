import { Injectable, signal, computed, inject } from '@angular/core';
import { StudentsService } from '../services/students.service';
import { Student } from '../models/student.model';

@Injectable({ providedIn: 'root' })
export class ParentAuthService {
  private studentsService = inject(StudentsService);

  currentStudentId = signal<number | null>(null);

  currentStudent = computed<Student | null>(() => {
    const id = this.currentStudentId();
    return id ? (this.studentsService.getById(id) ?? null) : null;
  });

  isLoggedIn = computed(() => this.currentStudentId() !== null);

  login(studentId: number) {
    this.currentStudentId.set(studentId);
  }

  logout() {
    this.currentStudentId.set(null);
  }
}
