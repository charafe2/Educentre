import { Component, Input } from '@angular/core';
import { MonthlyKpi } from '../../../../models/monthly-review.model';

@Component({
  selector: 'app-summary-card',
  standalone: true,
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.css',
})
export class SummaryCardComponent {
  @Input({ required: true }) kpi!: MonthlyKpi;
}
