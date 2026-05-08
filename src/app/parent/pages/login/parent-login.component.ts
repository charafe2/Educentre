import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { StudentsService } from '../../../services/students.service';
import { ParentAuthService } from '../../parent-auth.service';
import { Student } from '../../../models/student.model';

@Component({
  selector: 'app-parent-login',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './parent-login.component.html',
  styleUrl: './parent-login.component.css'
})
export class ParentLoginComponent {
  private studentsService = inject(StudentsService);
  private auth = inject(ParentAuthService);
  private router = inject(Router);

  students = this.studentsService.students;

  select(studentId: number): void {
    this.auth.login(studentId);
    this.router.navigate(['/parent/accueil']);
  }

  getInitials(s: Student): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }
}
