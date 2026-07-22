import { Component, computed, inject } from '@angular/core';
import { SummaryCardComponent } from '../summary-card/summary-card.component';
import { PaymentsService } from '../../../../services/payments.service';
import { StudentsService } from '../../../../services/students.service';
import { ClassesService } from '../../../../services/classes.service';
import { TeachersService } from '../../../../services/teachers.service';
import { TeacherPayrollService } from '../../../../services/teacher-payroll.service';
import { AttendanceService } from '../../../../services/attendance.service';
import { currentMonthKey } from '../../../../utils/current-month.util';
import { MonthlyKpi } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-monthly-summary-slide',
  standalone: true,
  imports: [SummaryCardComponent, TranslatePipe],
  templateUrl: './monthly-summary-slide.component.html',
  styleUrls: ['../slide-shell.css', './monthly-summary-slide.component.css'],
})
export class MonthlySummarySlideComponent {
  private paymentsService = inject(PaymentsService);
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private teachersService = inject(TeachersService);
  private payrollService = inject(TeacherPayrollService);
  private attendanceService = inject(AttendanceService);
  private i18n = inject(TranslationService);

  private t = (key: string) => this.i18n.translate(key);

  private month = currentMonthKey();

  private monthPayments = computed(() =>
    this.paymentsService.payments().filter(p => p.periodMonth === this.month)
  );

  private expectedRevenue = computed(() => this.monthPayments().reduce((sum, p) => sum + p.amount, 0));
  private collectedRevenue = computed(() =>
    this.monthPayments().filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  );
  private remainingRevenue = computed(() => this.expectedRevenue() - this.collectedRevenue());

  private salaryRows = computed(() =>
    this.payrollService.buildSalaryRows(this.teachersService.teachers(), this.classesService.classes(), this.month)
  );
  private teachersPaid = computed(() => this.salaryRows().filter(r => r.paid).length);
  private teachersRemaining = computed(() => this.salaryRows().filter(r => !r.paid).length);

  private newStudents = computed(() =>
    this.studentsService.students().filter(s => s.createdAt?.startsWith(this.month)).length
  );
  // No `deactivatedAt` timestamp exists on Student yet, so this is a live
  // snapshot of inactive students rather than a strict "left this month" count.
  private inactiveStudents = computed(() =>
    this.studentsService.students().filter(s => s.status === 'inactive').length
  );

  private attendanceRate = computed(() => this.attendanceService.getAttendanceRate());

  kpis = computed<MonthlyKpi[]>(() => {
    const cur = this.t('common.currency');
    return [
      {
        key: 'expected', label: this.t('monthlyReview.summary.expectedRevenue'), value: `${this.expectedRevenue().toLocaleString('fr-MA')} ${cur}`,
        icon: 'fa-solid fa-file-invoice-dollar', tone: 'neutral',
      },
      {
        key: 'collected', label: this.t('monthlyReview.summary.collectedRevenue'), value: `${this.collectedRevenue().toLocaleString('fr-MA')} ${cur}`,
        icon: 'fa-solid fa-sack-dollar', tone: 'success',
      },
      {
        key: 'remaining', label: this.t('monthlyReview.summary.remainingRevenue'), value: `${this.remainingRevenue().toLocaleString('fr-MA')} ${cur}`,
        icon: 'fa-solid fa-hourglass-half', tone: this.remainingRevenue() > 0 ? 'warning' : 'success',
      },
      {
        key: 'teachersPaid', label: this.t('monthlyReview.summary.teachersPaid'), value: `${this.teachersPaid()}`,
        icon: 'fa-solid fa-circle-check', tone: 'success',
      },
      {
        key: 'teachersRemaining', label: this.t('monthlyReview.summary.teachersRemaining'), value: `${this.teachersRemaining()}`,
        icon: 'fa-solid fa-chalkboard-user', tone: this.teachersRemaining() > 0 ? 'warning' : 'success',
      },
      {
        key: 'newStudents', label: this.t('monthlyReview.summary.newStudents'), value: `${this.newStudents()}`,
        icon: 'fa-solid fa-user-plus', tone: 'accent',
      },
      {
        key: 'inactiveStudents', label: this.t('monthlyReview.summary.inactiveStudents'), value: `${this.inactiveStudents()}`,
        icon: 'fa-solid fa-user-minus', tone: this.inactiveStudents() > 0 ? 'danger' : 'neutral',
      },
      {
        key: 'attendance', label: this.t('monthlyReview.summary.attendanceRate'), value: `${this.attendanceRate()}%`,
        icon: 'fa-regular fa-calendar-check', tone: 'accent',
      },
    ];
  });

  revenueTrend = computed(() => {
    const trend = this.paymentsService.getMonthlyRevenue().slice(-6);
    const max = Math.max(...trend.map(t => t.amount), 1);
    return trend.map(t => ({ ...t, heightPct: Math.round((t.amount / max) * 100) }));
  });
}
