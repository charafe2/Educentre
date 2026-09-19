import { Component, computed, inject } from '@angular/core';
import { TaskChecklistComponent } from '../task-checklist/task-checklist.component';
import { MonthlyTasksService } from '../../../../services/monthly-tasks.service';
import { currentMonthKey } from '../../../../utils/current-month.util';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

@Component({
  selector: 'app-tasks-slide',
  standalone: true,
  imports: [TaskChecklistComponent, TranslatePipe],
  templateUrl: './tasks-slide.component.html',
  styleUrls: ['../slide-shell.css', './tasks-slide.component.css'],
})
export class TasksSlideComponent {
  private tasksService = inject(MonthlyTasksService);
  private month = currentMonthKey();

  tasks = this.tasksService.tasks;

  // isDone() reads MonthlyTasksService's internal signal, so this computed
  // re-evaluates automatically whenever a task is toggled.
  doneMap = computed<Record<string, boolean>>(() =>
    Object.fromEntries(this.tasks.map(t => [t.id, this.tasksService.isDone(t.id, this.month)]))
  );

  completedCount = computed(() => this.tasksService.completedCount(this.month));

  toggle(taskId: string): void {
    this.tasksService.toggle(taskId, this.month);
  }
}
