import { Injectable, signal } from '@angular/core';
import { MonthlyTask } from '../models/monthly-review.model';

// TODO(backend): task completion isn't persisted server-side yet. This mirrors
// TeacherPayrollService's approach (localStorage today, swap for a real
// `monthly_review_tasks` table/API later — e.g. POST /api/v1/monthly-review/tasks/:id/toggle).
const STORAGE_KEY = 'moujtahid.monthlyTasks.v1';

// `label` / `description` hold translation keys, resolved via the `t` pipe
// where the tasks are rendered (see TaskChecklistComponent).
export const DEFAULT_MONTHLY_TASKS: MonthlyTask[] = [
  { id: 'attendance', label: 'monthlyReview.tasks.items.attendance', description: 'monthlyReview.tasks.items.attendance_desc' },
  { id: 'teachers', label: 'monthlyReview.tasks.items.teachers', description: 'monthlyReview.tasks.items.teachers_desc' },
  { id: 'followup', label: 'monthlyReview.tasks.items.followup', description: 'monthlyReview.tasks.items.followup_desc' },
  { id: 'schedules', label: 'monthlyReview.tasks.items.schedules', description: 'monthlyReview.tasks.items.schedules_desc' },
  { id: 'expenses', label: 'monthlyReview.tasks.items.expenses', description: 'monthlyReview.tasks.items.expenses_desc' },
  { id: 'archive', label: 'monthlyReview.tasks.items.archive', description: 'monthlyReview.tasks.items.archive_desc' },
];

interface TaskCompletion {
  taskId: string;
  month: string;
  done: boolean;
}

@Injectable({ providedIn: 'root' })
export class MonthlyTasksService {
  private completions = signal<TaskCompletion[]>(this.loadFromStorage());

  readonly tasks = DEFAULT_MONTHLY_TASKS;

  isDone(taskId: string, month: string): boolean {
    return this.completions().some(c => c.taskId === taskId && c.month === month && c.done);
  }

  toggle(taskId: string, month: string): void {
    this.completions.update(list => {
      const existing = list.find(c => c.taskId === taskId && c.month === month);
      if (existing) {
        return list.map(c => c === existing ? { ...c, done: !c.done } : c);
      }
      return [...list, { taskId, month, done: true }];
    });
    this.persist();
  }

  completedCount(month: string): number {
    return this.tasks.filter(t => this.isDone(t.id, month)).length;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.completions()));
    } catch {
      // Storage unavailable — state stays in-memory for this session.
    }
  }

  private loadFromStorage(): TaskCompletion[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}
