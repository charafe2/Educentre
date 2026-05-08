import { Component, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StudentsService } from '../../services/students.service';
import { Student } from '../../models/student.model';

@Component({
  selector: 'app-recent-inscriptions',
  imports: [NgClass, RouterLink],
  templateUrl: './recent-inscriptions.component.html',
  styleUrl: './recent-inscriptions.component.css'
})
export class RecentInscriptionsComponent {
  private studentsService = inject(StudentsService);

  recentStudents = computed(() =>
    [...this.studentsService.students()]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5)
  );

  getInitials(s: Student): string {
    return (s.firstName[0] + s.lastName[0]).toUpperCase();
  }

  formatDate(createdAt: string): string {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (createdAt === today) return "Auj.";
    if (createdAt === yesterday) return 'Hier';
    const [, month, day] = createdAt.split('-');
    return `${day}/${month}`;
  }

  paymentLabel(status: string): string {
    const map: Record<string, string> = { paid: 'Payé', pending: 'En attente', overdue: 'Impayé' };
    return map[status] ?? status;
  }

  paymentClass(status: string): string {
    return status === 'overdue' ? 'status-unpaid' : `status-${status}`;
  }
}
