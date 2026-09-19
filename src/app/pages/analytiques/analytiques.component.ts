import { Component, computed, inject, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { AnalyticsPeriod, AnalyticsReport } from '../../models/analytics.model';
import { PaymentIssueStatus, StudentAttritionRisk, StudentAttritionRiskReport } from '../../models/retention-risk.model';
import { AnalyticsService } from '../../services/analytics.service';
import { RetentionService } from '../../services/retention.service';
import { ToastService } from '../../services/toast.service';
import { PaginationMeta } from '../../models/api-response.model';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

const EMPTY_PAGINATION: PaginationMeta = {
  current_page: 1,
  per_page: 8,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

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
  teacherPerformancePagination: EMPTY_PAGINATION,
};

interface TrendPoint {
  x: number;
  y: number;
  value: number;
  month: string;
  monthLabel: string;
  longMonthLabel: string;
}

@Component({
  selector: 'app-analytiques',
  imports: [NgStyle, NgClass, TranslatePipe],
  templateUrl: './analytiques.component.html',
  styleUrl: './analytiques.component.css'
})
export class AnalytiquesComponent {
  private analyticsService = inject(AnalyticsService);
  private retentionService = inject(RetentionService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  // `label` holds a translation key, resolved in the template via `| t`.
  periods: Array<{ key: AnalyticsPeriod; label: string }> = [
    { key: 'last_3_months', label: 'analytics.period3m' },
    { key: 'last_6_months', label: 'analytics.period6m' },
    { key: 'this_year', label: 'analytics.periodYear' },
    { key: 'last_year', label: 'analytics.periodLastYear' },
  ];
  selectedPeriod = signal<AnalyticsPeriod>('last_6_months');
  report = signal<AnalyticsReport>(EMPTY_REPORT);
  riskReport = signal<StudentAttritionRiskReport | null>(null);
  riskPagination = signal<PaginationMeta>(EMPTY_PAGINATION);
  teacherPage = signal(1);
  riskPage = signal(1);
  riskLoading = signal(true);
  riskExpanded = signal(false);
  attendanceExpanded = signal(false);
  activeTrendIndex = signal<number | null>(null);
  activeRevenueIndex = signal<number | null>(null);

  totalStudents = computed(() => this.report().summary.totalStudents);
  activeStudents = computed(() => this.report().summary.activeStudents);
  totalRevenue = computed(() => this.report().summary.totalRevenue);
  attendanceRate = computed(() => this.report().summary.attendanceRate);
  activeTeachers = computed(() => this.report().summary.activeTeachers);
  paymentDistribution = computed(() => this.report().paymentDistribution);
  teacherPerformance = computed(() => this.report().teacherPerformance);
  teacherPerformancePagination = computed(() => this.report().teacherPerformancePagination);
  studentRisks = computed(() => this.riskReport()?.students ?? []);
  riskCount = computed(() => this.riskPagination().total);
  teacherPerformanceRangeLabel = computed(() => this.rangeLabel(this.teacherPerformancePagination()));
  riskRangeLabel = computed(() => this.rangeLabel(this.riskPagination()));

  monthlyRevenues = computed(() => {
    const revenues = this.report().monthlyRevenues;
    const maxAmount = Math.max(...revenues.map(item => item.amount), 1);

    return revenues.map((item, index) => ({
      ...item,
      monthKey: item.month,
      month: this.monthLabel(item.month, 'short'),
      longMonth: this.monthLabel(item.month, 'long'),
      maxAmount,
      isBest: item.amount === maxAmount,
      index,
    }));
  });
  revenueLatest = computed(() => this.report().monthlyRevenues.at(-1)?.amount ?? 0);
  revenuePrevious = computed(() => this.report().monthlyRevenues.at(-2)?.amount ?? 0);
  revenueDelta = computed(() => this.revenueLatest() - this.revenuePrevious());
  revenueGrowthPct = computed(() => {
    const previous = this.revenuePrevious();
    if (!previous) return 0;
    return Math.round(((this.revenueLatest() - previous) / previous) * 1000) / 10;
  });
  revenueAverage = computed(() => {
    const revenues = this.report().monthlyRevenues;
    if (revenues.length === 0) return 0;
    return Math.round(revenues.reduce((sum, item) => sum + item.amount, 0) / revenues.length);
  });
  bestRevenueMonth = computed(() => {
    const revenues = this.report().monthlyRevenues;
    const best = revenues.reduce((winner, item) => item.amount > winner.amount ? item : winner, revenues[0] ?? { month: '', amount: 0 });
    return {
      label: best.month ? this.monthLabel(best.month, 'long') : '-',
      amount: best.amount,
    };
  });
  revenueYAxisLabels = computed(() => {
    const maxAmount = Math.max(...this.report().monthlyRevenues.map(item => item.amount), 1);
    const top = Math.ceil(maxAmount / 5000) * 5000 || 5000;
    return [top, top * 0.8, top * 0.6, top * 0.4, top * 0.2, 0].map(value => Math.round(value));
  });
  activeRevenue = computed(() => {
    const revenues = this.monthlyRevenues();
    if (revenues.length === 0) return null;
    const index = this.activeRevenueIndex();
    return index === null ? revenues.at(-1) ?? null : revenues[index] ?? revenues.at(-1) ?? null;
  });

  classAttendance = computed(() => {
    const colors = ['#0d9488', '#7c3aed', '#dc2626', '#d97706', '#059669', '#0891b2'];
    return this.report().classAttendance.map((item, index) => ({
      ...item,
      color: colors[index % colors.length],
    }));
  });
  attendanceAverage = computed(() => {
    const classes = this.classAttendance();
    if (classes.length === 0) return this.attendanceRate();
    const average = classes.reduce((sum, item) => sum + item.rate, 0) / classes.length;
    return Math.round(average * 10) / 10;
  });

  enrollmentTrend = computed(() => this.report().enrollmentTrend.map(item => item.total));
  trendMonths = computed(() => this.report().enrollmentTrend.map(item => this.monthLabel(item.month, 'short')));
  trendMonthColumns = computed(() => `repeat(${Math.max(this.trendMonths().length, 1)}, minmax(42px, 1fr))`);
  trendLatest = computed(() => this.report().enrollmentTrend.at(-1)?.total ?? 0);
  trendPrevious = computed(() => this.report().enrollmentTrend.at(-2)?.total ?? 0);
  newStudentsThisMonth = computed(() => Math.max(this.trendLatest() - this.trendPrevious(), 0));
  enrollmentGrowthPct = computed(() => {
    const previous = this.trendPrevious();
    if (!previous) return 0;
    return Math.round(((this.trendLatest() - previous) / previous) * 1000) / 10;
  });
  bestEnrollmentMonth = computed(() => {
    const trend = this.report().enrollmentTrend;
    const best = trend.reduce((winner, item) => item.total > winner.total ? item : winner, trend[0] ?? { month: '', total: 0 });
    return {
      label: best.month ? this.monthLabel(best.month, 'long') : '-',
      total: best.total,
    };
  });
  trendYAxisLabels = computed(() => {
    const maxValue = Math.max(...this.enrollmentTrend(), 1);
    const top = Math.ceil(maxValue / 50) * 50 || 50;
    return Array.from({ length: 6 }, (_, index) => {
      const value = Math.round((top / 5) * (5 - index));
      return {
        value,
        y: 28 + index * 38,
      };
    });
  });
  trendGridLines = computed(() => this.trendYAxisLabels().map(item => item.y));
  trendPoints = computed(() => this.chartPoints());
  activeTrendPoint = computed(() => {
    const points = this.trendPoints();
    if (points.length === 0) return null;
    const activeIndex = this.activeTrendIndex();
    return activeIndex === null ? points.at(-1) ?? null : points[activeIndex] ?? points.at(-1) ?? null;
  });

  constructor() {
    this.loadReport();
    this.loadStudentRisks();
  }

  selectPeriod(period: AnalyticsPeriod): void {
    this.selectedPeriod.set(period);
    this.teacherPage.set(1);
    this.loadReport();
  }

  get svgPoints(): string {
    return this.trendPoints().map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  }

  get svgFillPath(): string {
    const points = this.trendPoints();
    if (points.length === 0) {
      return '';
    }

    return `M${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' L')} L948,218 L54,218 Z`;
  }

  get svgDots(): TrendPoint[] {
    return this.trendPoints();
  }

  get latestTrendDot(): TrendPoint | null {
    return this.trendPoints().at(-1) ?? null;
  }

  getBarHeight(amount: number, max: number): number {
    return Math.round((amount / max) * 100);
  }

  formatDhs(amount: number): string {
    return `${amount.toLocaleString('fr-MA')} ${this.t('common.currency')}`;
  }

  studentInitials(student: StudentAttritionRisk): string {
    return student.studentName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
  }

  paymentStatusLabel(status: PaymentIssueStatus): string {
    return status === 'overdue' ? this.t('analytics.paymentOverdue') : this.t('analytics.paymentPending');
  }

  paymentPeriodLabel(period: string): string {
    return this.monthLabel(period, 'long');
  }

  nextTeacherPerformancePage(): void {
    const page = this.teacherPerformancePagination();
    if (page.current_page < page.last_page) {
      this.teacherPage.set(page.current_page + 1);
      this.loadReport();
    }
  }

  previousTeacherPerformancePage(): void {
    const page = this.teacherPerformancePagination();
    if (page.current_page > 1) {
      this.teacherPage.set(page.current_page - 1);
      this.loadReport();
    }
  }

  nextRiskPage(): void {
    const page = this.riskPagination();
    if (page.current_page < page.last_page) {
      this.riskPage.set(page.current_page + 1);
      this.loadStudentRisks();
    }
  }

  previousRiskPage(): void {
    const page = this.riskPagination();
    if (page.current_page > 1) {
      this.riskPage.set(page.current_page - 1);
      this.loadStudentRisks();
    }
  }

  toggleAttendanceDetails(): void {
    this.attendanceExpanded.update(value => !value);
  }

  toggleRiskPanel(): void {
    this.riskExpanded.update(value => !value);
  }

  setActiveTrendPoint(index: number): void {
    this.activeTrendIndex.set(index);
  }

  clearActiveTrendPoint(): void {
    this.activeTrendIndex.set(null);
  }

  setActiveRevenue(index: number): void {
    this.activeRevenueIndex.set(index);
  }

  clearActiveRevenue(): void {
    this.activeRevenueIndex.set(null);
  }

  trendTooltipTransform(point: TrendPoint): string {
    const x = Math.min(Math.max(point.x - 40, 54), 868);
    const y = Math.max(point.y - 88, 8);
    return `translate(${x},${y})`;
  }

  private loadReport(): void {
    this.analyticsService.getReport(this.selectedPeriod(), this.teacherPage(), 8).subscribe({
      next: response => {
        if (response.success) {
          this.report.set(response.data);
        }
      },
      error: () => this.toast.show(this.t('analytics.loadReportError'), 'error'),
    });
  }

  private loadStudentRisks(): void {
    this.riskLoading.set(true);
    this.retentionService.getStudentRisks(this.riskPage(), 8).subscribe({
      next: response => {
        if (response.success) {
          this.riskReport.set(response.data);
          this.riskPagination.set(response.meta.pagination);
        }
        this.riskLoading.set(false);
      },
      error: () => {
        this.riskLoading.set(false);
        this.toast.show(this.t('analytics.loadRiskError'), 'error');
      },
    });
  }

  private chartPoints(): TrendPoint[] {
    const trend = this.report().enrollmentTrend;
    const values = trend.map(item => item.total);
    const maxValue = Math.max(...values, 1);
    const topValue = Math.ceil(maxValue / 50) * 50 || 50;
    const chartLeft = 54;
    const chartWidth = 894;
    const chartTop = 28;
    const chartHeight = 190;

    return trend.map((item, index) => ({
      x: values.length === 1 ? chartLeft + chartWidth / 2 : chartLeft + (index / (values.length - 1)) * chartWidth,
      y: chartTop + chartHeight - (item.total / topValue) * chartHeight,
      value: item.total,
      month: item.month,
      monthLabel: this.monthLabel(item.month, 'short'),
      longMonthLabel: this.monthLabel(item.month, 'long'),
    }));
  }

  private monthLabel(month: string, style: 'short' | 'long'): string {
    const locale = { fr: 'fr-MA', ar: 'ar-MA', en: 'en-GB' }[this.i18n.lang()];
    return new Intl.DateTimeFormat(locale, { month: style }).format(new Date(`${month}-01`));
  }

  private rangeLabel(page: PaginationMeta): string {
    if (!page.total) return this.t('students.noResult');
    return this.t('students.rangeLabel', { from: page.from ?? 0, to: page.to ?? 0, total: page.total });
  }
}
