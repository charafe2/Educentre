import { Component, signal, computed, inject } from '@angular/core';
import { NgStyle, NgClass } from '@angular/common';
import { StudentsService } from '../../services/students.service';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { PaymentsService } from '../../services/payments.service';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-analytiques',
  imports: [NgStyle, NgClass],
  templateUrl: './analytiques.component.html',
  styleUrl: './analytiques.component.css'
})
export class AnalytiquesComponent {
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private paymentsService = inject(PaymentsService);
  private attendanceService = inject(AttendanceService);

  selectedPeriod = signal('6 derniers mois');
  periods = ['3 derniers mois', '6 derniers mois', 'Cette année', 'Année dernière'];

  totalStudents = computed(() => this.studentsService.students().length);
  activeStudents = computed(() => this.studentsService.students().filter(s => s.status === 'active').length);
  totalRevenue = computed(() => this.paymentsService.getTotals().totalPaid);
  attendanceRate = computed(() => this.attendanceService.getAttendanceRate());

  monthlyRevenues = computed(() => {
    const rawData = this.paymentsService.getMonthlyRevenue();
    const monthNames: Record<string, string> = {
      '2025-01': 'Jan', '2025-02': 'Fév', '2025-03': 'Mar',
      '2025-04': 'Avr', '2025-05': 'Mai', '2025-06': 'Jun',
      '2024-12': 'Déc',
    };
    const all = rawData.map(r => ({ month: monthNames[r.month] ?? r.month, amount: r.amount }));
    const maxAmount = Math.max(...all.map(r => r.amount), 1000);
    return all.map(r => ({ ...r, maxAmount }));
  });

  classAttendance = computed(() => {
    return this.classesService.classes().map(c => ({
      className: c.name,
      rate: this.computeClassAttendanceRate(c.id),
      color: c.color,
    }));
  });

  private attendanceRates = [94, 89, 92, 91, 87, 85];
  private avgGrades = [14.2, 13.8, 15.1, 14.6, 13.5, 14.0];

  teacherPerformance = computed(() => {
    return this.teachersService.teachers().map((t, i) => {
      const classes = this.classesService.getByIds(t.classIds);
      const studentCount = classes.reduce((s, c) => s + c.enrolledStudentIds.length, 0);
      return {
        name: `${t.firstName} ${t.lastName}`,
        classes: classes.length,
        students: studentCount,
        attendanceRate: this.attendanceRates[i] ?? 90,
        avgGrade: this.avgGrades[i] ?? 14.0,
      };
    });
  });

  enrollmentTrend = [42, 58, 71, 89, 112, 134, 158, 187, 210, 231, 248, 248];
  trendMonths = ['Juin', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai'];

  paymentDistribution = computed(() => {
    const students = this.studentsService.students();
    const total = students.length || 1;
    const paid    = students.filter(s => s.paymentStatus === 'paid').length;
    const pending = students.filter(s => s.paymentStatus === 'pending').length;
    const overdue = students.filter(s => s.paymentStatus === 'overdue').length;
    return {
      paid:    { count: paid,    pct: Math.round(paid    / total * 100) },
      pending: { count: pending, pct: Math.round(pending / total * 100) },
      overdue: { count: overdue, pct: Math.round(overdue / total * 100) },
      total:   students.length,
    };
  });

  get svgPoints(): string {
    const maxVal = Math.max(...this.enrollmentTrend);
    const w = 540, h = 100;
    return this.enrollmentTrend.map((v, i) => {
      const x = (i / (this.enrollmentTrend.length - 1)) * w;
      const y = h - (v / maxVal) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  get svgFillPath(): string {
    const maxVal = Math.max(...this.enrollmentTrend);
    const w = 540, h = 100;
    const pts = this.enrollmentTrend.map((v, i) => {
      const x = (i / (this.enrollmentTrend.length - 1)) * w;
      const y = h - (v / maxVal) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M${pts.join(' L')} L${w},${h} L0,${h} Z`;
  }

  get svgDots(): { x: number; y: number; value: number }[] {
    const maxVal = Math.max(...this.enrollmentTrend);
    const w = 540, h = 100;
    return this.enrollmentTrend.map((v, i) => ({
      x: (i / (this.enrollmentTrend.length - 1)) * w,
      y: h - (v / maxVal) * h,
      value: v,
    }));
  }

  private classDefaultRates: Record<number, number> = { 1: 96, 2: 89, 3: 93, 4: 91, 5: 87, 6: 85 };

  private computeClassAttendanceRate(classeId: number): number {
    const classe = this.classesService.getById(classeId);
    if (!classe) return 0;
    const allRecords = this.attendanceService.records();
    const relevantRecords = allRecords.filter(r => {
      return classe.enrolledStudentIds.includes(r.studentId);
    });
    if (relevantRecords.length === 0) return this.classDefaultRates[classeId] ?? 90;
    const positive = relevantRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    return Math.round((positive / relevantRecords.length) * 100);
  }

  getBarHeight(amount: number, max: number): number {
    return Math.round((amount / max) * 100);
  }

  onPeriodChange(event: Event): void {
    this.selectedPeriod.set((event.target as HTMLSelectElement).value);
  }
}
