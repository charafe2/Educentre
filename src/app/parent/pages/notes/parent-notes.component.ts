import { Component, computed } from '@angular/core';
import { NgClass } from '@angular/common';

interface Grade {
  subject: string;
  title: string;
  score: number;
  maxScore: number;
  date: string;
  color: string;
}

@Component({
  selector: 'app-parent-notes',
  standalone: true,
  imports: [NgClass],
  templateUrl: './parent-notes.component.html',
  styleUrl: './parent-notes.component.css'
})
export class ParentNotesComponent {

  grades: Grade[] = [
    { subject: 'Mathématiques',  title: 'Contrôle N°1',   score: 14, maxScore: 20, date: '2025-04-15', color: '#1d4ed8' },
    { subject: 'Mathématiques',  title: 'Devoir Maison',  score: 17, maxScore: 20, date: '2025-04-28', color: '#1d4ed8' },
    { subject: 'Physique-Chimie', title: 'TP Optique',    score: 12, maxScore: 20, date: '2025-04-10', color: '#c2410c' },
    { subject: 'Physique-Chimie', title: 'Contrôle N°1', score: 15, maxScore: 20, date: '2025-04-22', color: '#c2410c' },
    { subject: 'Français',       title: 'Rédaction',      score: 13, maxScore: 20, date: '2025-04-18', color: '#166534' },
    { subject: 'Anglais',        title: 'Oral',           score: 16, maxScore: 20, date: '2025-04-25', color: '#6b21a8' },
  ];

  gradesBySubject = computed(() => {
    const map = new Map<string, Grade[]>();
    this.grades.forEach(g => {
      const list = map.get(g.subject) ?? [];
      list.push(g);
      map.set(g.subject, list);
    });
    return Array.from(map.entries()).map(([subject, grades]) => ({
      subject,
      grades,
      avg: Math.round(grades.reduce((s, g) => s + g.score / g.maxScore * 20, 0) / grades.length * 10) / 10,
      color: grades[0].color,
    }));
  });

  overallAvg = computed(() => {
    const all = this.grades;
    return Math.round(all.reduce((s, g) => s + g.score / g.maxScore * 20, 0) / all.length * 10) / 10;
  });

  gradeColorClass(score: number, max: number): string {
    const pct = score / max;
    if (pct >= 0.75) return 'grade-success';
    if (pct >= 0.55) return 'grade-warning';
    return 'grade-danger';
  }

  overallColorClass(): string {
    return this.gradeColorClass(this.overallAvg(), 20);
  }

  scoreBar(score: number, max: number): number {
    return Math.round(score / max * 100);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
