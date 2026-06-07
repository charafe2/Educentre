import { Component, computed, inject, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { AnalyticsPeriod, AnalyticsReport } from '../../models/analytics.model';
import { PaymentIssueStatus, StudentAttritionRisk, StudentAttritionRiskReport } from '../../models/retention-risk.model';
import { AnalyticsService } from '../../services/analytics.service';
import { RetentionService } from '../../services/retention.service';
import { ToastService } from '../../services/toast.service';

const EMPTY_REPORT: AnalyticsReport = {
  period: { key: 'last_6_months', start: '', end: '' },
  summary: { totalRevenue: 0, totalStudents: 0, activeStudents: 0, attendanceRate: 0, activeTeachers: 0 },
  paymentDistribution: {
    paid: { count: 0, pct: 0 },
    pending: { count: 0, pct: 0 },
    overdue: { count: 0, pct: 0 },
    total: 0,
  },
  monthlyRevenues: [],
  classAttendance: [],
  enrollmentTrend: [],
  teacherPerformance: [],
};

@Component({
  selector: 'app-analytiques',
  imports: [NgStyle, NgClass],
  templateUrl: './analytiques.component.html',
  styleUrl: './analytiques.component.css'
})
export class AnalytiquesComponent {
  private analyticsService = inject(AnalyticsService);
  private retentionService = inject(RetentionService);
  private toast = inject(ToastService);

  periods: Array<{ key: AnalyticsPeriod; label: string }> = [
    { key: 'last_3_months', label: '3 derniers mois' },
    { key: 'last_6_months', label: '6 derniers mois' },
    { key: 'this_year', label: 'Cette année' },
    { key: 'last_year', label: 'Année dernière' },
  ];
  selectedPeriod = signal<AnalyticsPeriod>('last_6_months');
  report = signal<AnalyticsReport>(EMPTY_REPORT);
  riskReport = signal<StudentAttritionRiskReport | null>(null);
  riskLoading = signal(true);

  totalStudents = computed(() => this.report().summary.totalStudents);
  activeStudents = computed(() => this.report().summary.activeStudents);
  totalRevenue = computed(() => this.report().summary.totalRevenue);
  attendanceRate = computed(() => this.report().summary.attendanceRate);
  activeTeachers = computed(() => this.report().summary.activeTeachers);
  paymentDistribution = computed(() => this.report().paymentDistribution);
  teacherPerformance = computed(() => this.report().teacherPerformance);
  studentRisks = computed(() => this.riskReport()?.students ?? []);
  riskCount = computed(() => this.studentRisks().length);

  monthlyRevenues = computed(() => {
    const revenues = this.report().monthlyRevenues;
    const maxAmount = Math.max(...revenues.map(item => item.amount), 1);

    return revenues.map(item => ({
      ...item,
      month: this.monthLabel(item.month, 'short'),
      maxAmount,
    }));
  });

  classAttendance = computed(() => {
    const colors = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2'];
    return this.report().classAttendance.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }));
  });

  enrollmentTrend = computed(() => this.report().enrollmentTrend.map(item => item.total));
  trendMonths = computed(() => this.report().enrollmentTrend.map(item => this.monthLabel(item.month, 'short')));

  constructor() {
    this.loadReport();
    this.loadStudentRisks();
  }

  selectPeriod(period: AnalyticsPeriod): void {
    this.selectedPeriod.set(period);
    this.loadReport();
  }

  get svgPoints(): string {
    return this.chartPoints().map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  }

  get svgFillPath(): string {
    const points = this.chartPoints();
    if (points.length === 0) {
      return '';
    }

    return `M${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' L')} L540,100 L0,100 Z`;
  }

  get svgDots(): { x: number; y: number; value: number }[] {
    return this.chartPoints();
  }

  getBarHeight(amount: number, max: number): number {
    return Math.round((amount / max) * 100);
  }

  studentInitials(student: StudentAttritionRisk): string {
    return student.studentName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  paymentStatusLabel(status: PaymentIssueStatus): string {
    return status === 'overdue' ? 'En retard' : 'En attente';
  }

  paymentPeriodLabel(period: string): string {
    return this.monthLabel(period, 'long');
  }

  private loadReport(): void {
    this.analyticsService.getReport(this.selectedPeriod()).subscribe({
      next: response => {
        if (response.success) {
          this.report.set(response.data);
        }
      },
      error: () => this.toast.show('Impossible de charger les analytiques', 'error'),
    });
  }

  private loadStudentRisks(): void {
    this.riskLoading.set(true);
    this.retentionService.getStudentRisks().subscribe({
      next: response => {
        if (response.success) {
          this.riskReport.set(response.data);
        }
        this.riskLoading.set(false);
      },
      error: () => {
        this.riskLoading.set(false);
        this.toast.show('Impossible de charger les risques de départ', 'error');
      },
    });
  }

  private chartPoints(): { x: number; y: number; value: number }[] {
    const values = this.enrollmentTrend();
    const maxValue = Math.max(...values, 1);

    return values.map((value, index) => ({
      x: values.length === 1 ? 270 : (index / (values.length - 1)) * 540,
      y: 100 - (value / maxValue) * 100,
      value,
    }));
  }

  private monthLabel(month: string, style: 'short' | 'long'): string {
    return new Intl.DateTimeFormat('fr-MA', { month: style }).format(new Date(`${month}-01`));
  }
}
