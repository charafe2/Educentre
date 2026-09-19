import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MonthlyTask } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';

@Component({
  selector: 'app-task-checklist',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './task-checklist.component.html',
  styleUrl: './task-checklist.component.css',
})
export class TaskChecklistComponent {
  @Input() tasks: MonthlyTask[] = [];
  @Input() doneMap: Record<string, boolean> = {};
  @Output() toggle = new EventEmitter<string>();
}
