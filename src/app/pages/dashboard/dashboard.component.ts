import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatCardComponent, StatCardData } from '../../components/stat-card/stat-card.component';
import { RecentInscriptionsComponent } from '../../components/recent-inscriptions/recent-inscriptions.component';
import { SchedulePanelComponent } from '../../components/schedule-panel/schedule-panel.component';
import { StudentsService } from '../../services/students.service';
import { PaymentsService } from '../../services/payments.service';
import { AttendanceService } from '../../services/attendance.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatCardComponent, RecentInscriptionsComponent, SchedulePanelComponent, TranslatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private studentsService = inject(StudentsService);
  private paymentsService = inject(PaymentsService);
  private attendanceService = inject(AttendanceService);
  private i18n = inject(TranslationService);

  private currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  private activeCount = computed(() =>
    this.studentsService.students().filter(s => s.status === 'active').length
  );

  private monthlyRevenue = computed(() =>
    this.paymentsService.payments()
      .filter(p => p.status === 'paid' && p.periodMonth === this.currentMonth)
      .reduce((sum, p) => sum + p.amount, 0)
  );

  private overdueCount = computed(() =>
    this.paymentsService.payments().filter(p => p.status === 'overdue').length
  );

  private overdueAmount = computed(() =>
    this.paymentsService.payments()
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0)
  );

  private attendanceRate = computed(() => this.attendanceService.getAttendanceRate());

  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  stats = computed<StatCardData[]>(() => [
    {
      title: this.t('dashboard.activeStudents'),
      value: this.activeCount().toString(),
      trendLabel: this.t('dashboard.totalEnrolled', { count: this.studentsService.students().length }),
      trendType: 'up',
      iconClass: 'fa-solid fa-users',
      iconColorClass: 'icon-blue',
      sparkPath: 'M0 30 Q 20 20, 40 25 T 80 10 T 100 5',
      sparkColor: 'var(--accent)',
    },
    {
      title: this.t('dashboard.monthlyRevenue'),
      value: `${this.monthlyRevenue().toLocaleString('fr-MA')}<span style="font-size:1.2rem;color:var(--text-light);margin-left:2px;">${this.t('common.currency')}</span>`,
      trendLabel: this.t('dashboard.monthPayments'),
      trendType: 'up',
      iconClass: 'fa-solid fa-wallet',
      iconColorClass: 'icon-green',
      sparkPath: 'M0 35 L 20 25 L 40 30 L 60 15 L 80 20 L 100 5',
      sparkColor: 'var(--success)',
    },
    {
      title: this.t('dashboard.attendance'),
      value: `${this.attendanceRate()}<span style="font-size:1.2rem;color:var(--text-light);">%</span>`,
      trendLabel: this.t('dashboard.allSessions'),
      trendType: 'neutral',
      iconClass: 'fa-regular fa-calendar-check',
      iconColorClass: 'icon-orange',
      sparkPath: 'M0 15 Q 20 15, 40 18 T 80 15 T 100 15',
      sparkColor: 'var(--warning)',
    },
    {
      title: this.t('dashboard.unpaid'),
      value: this.overdueCount().toString(),
      trendLabel: `${this.overdueAmount().toLocaleString('fr-MA')} ${this.t('common.currency')}`,
      trendType: 'down',
      iconClass: 'fa-solid fa-triangle-exclamation',
      iconColorClass: 'icon-red',
      sparkPath: 'M0 10 L 20 15 L 40 10 L 60 25 L 80 20 L 100 35',
      sparkColor: 'var(--danger)',
      urgent: this.overdueCount() > 0,
      route: '/finances',
    },
  ]);
}
