export type AnalyticsPeriod = 'last_3_months' | 'last_6_months' | 'this_year' | 'last_year';

export interface AnalyticsReport {
  period: {
    key: AnalyticsPeriod;
    start: string;
    end: string;
  };
  summary: {
    totalRevenue: number;
    totalStudents: number;
    activeStudents: number;
    attendanceRate: number;
    activeTeachers: number;
  };
  paymentDistribution: {
    paid: AnalyticsDistributionItem;
    pending: AnalyticsDistributionItem;
    overdue: AnalyticsDistributionItem;
    total: number;
  };
  monthlyRevenues: Array<{ month: string; amount: number }>;
  classAttendance: Array<{ className: string; rate: number }>;
  enrollmentTrend: Array<{ month: string; total: number }>;
  teacherPerformance: Array<{
    name: string;
    classes: number;
    students: number;
    attendanceRate: number;
    collectedRevenue: number;
  }>;
}

interface AnalyticsDistributionItem {
  count: number;
  pct: number;
}
