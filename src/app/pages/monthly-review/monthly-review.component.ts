import { Component, computed, inject, signal } from '@angular/core';
import { ReviewCarouselComponent } from './components/review-carousel/review-carousel.component';
import { MonthlyProgressComponent } from './components/monthly-progress/monthly-progress.component';
import { TeacherSalarySlideComponent } from './components/teacher-salary-slide/teacher-salary-slide.component';
import { StudentPaymentSlideComponent } from './components/student-payment-slide/student-payment-slide.component';
import { MonthlySummarySlideComponent } from './components/monthly-summary-slide/monthly-summary-slide.component';
import { TasksSlideComponent } from './components/tasks-slide/tasks-slide.component';
import { AIInsightsSlideComponent } from './components/ai-insights-slide/ai-insights-slide.component';
import { TeacherPayrollService } from '../../services/teacher-payroll.service';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { PaymentsService } from '../../services/payments.service';
import { MonthlyTasksService } from '../../services/monthly-tasks.service';
import { currentMonthKey } from '../../utils/current-month.util';
import { MonthlyReviewSlideConfig } from '../../models/monthly-review.model';

// The slide list is the single source of truth for the carousel: add a new
// entry here (+ its slide component in the template) to extend the review
// without touching ReviewCarousel or MonthlyProgress.
// `label` holds a translation key resolved in the template via the `t` pipe.
const SLIDES: MonthlyReviewSlideConfig[] = [
  { id: 'salaries', label: 'monthlyReview.steps.salaries', icon: 'fa-solid fa-chalkboard-user' },
  { id: 'payments', label: 'monthlyReview.steps.payments', icon: 'fa-solid fa-sack-dollar' },
  { id: 'summary', label: 'monthlyReview.steps.summary', icon: 'fa-solid fa-chart-pie' },
  { id: 'tasks', label: 'monthlyReview.steps.tasks', icon: 'fa-solid fa-list-check' },
  { id: 'insights', label: 'monthlyReview.steps.insights', icon: 'fa-solid fa-sparkles' },
];

@Component({
  selector: 'app-monthly-review',
  standalone: true,
  imports: [
    ReviewCarouselComponent,
    MonthlyProgressComponent,
    TeacherSalarySlideComponent,
    StudentPaymentSlideComponent,
    MonthlySummarySlideComponent,
    TasksSlideComponent,
    AIInsightsSlideComponent,
  ],
  templateUrl: './monthly-review.component.html',
  styleUrl: './monthly-review.component.css',
})
export class MonthlyReviewComponent {
  private payrollService = inject(TeacherPayrollService);
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private paymentsService = inject(PaymentsService);
  private tasksService = inject(MonthlyTasksService);

  private month = currentMonthKey();

  slides = SLIDES;
  activeIndex = signal(0);

  // Completion = average of (teachers paid, students paid, tasks done) for
  // the current month — updates automatically as the owner works through
  // each section, independent of which slide is currently in view.
  completionPercent = computed(() => {
    const salaryRows = this.payrollService.buildSalaryRows(
      this.teachersService.teachers(),
      this.classesService.classes(),
      this.month
    );
    const teachersRatio = salaryRows.length
      ? salaryRows.filter(r => r.paid).length / salaryRows.length
      : 1;

    const monthPayments = this.paymentsService.payments().filter(p => p.periodMonth === this.month);
    const paymentsRatio = monthPayments.length
      ? monthPayments.filter(p => p.status === 'paid').length / monthPayments.length
      : 1;

    const tasksRatio = this.tasksService.tasks.length
      ? this.tasksService.completedCount(this.month) / this.tasksService.tasks.length
      : 1;

    return Math.round(((teachersRatio + paymentsRatio + tasksRatio) / 3) * 100);
  });

  setActiveIndex(index: number): void {
    this.activeIndex.set(index);
  }
}
