import { Injectable, inject } from '@angular/core';
import { StudentsService } from './students.service';
import { PaymentsService } from './payments.service';
import { ClassesService } from './classes.service';
import { TeachersService } from './teachers.service';
import { TeacherPayrollService } from './teacher-payroll.service';
import { AttendanceService } from './attendance.service';
import { Payment } from '../models/payment.model';

export interface MonthlyInsight {
  icon: string;
  text: string;
}

// TODO(AI): this generates a deterministic, rule-based executive summary
// entirely client-side from data already loaded by the other services below.
// It's the "mock data layer" for Section 5 — swap `buildInsights()` for a
// real call to a backend/LLM endpoint once one exists, e.g.
//   GET /api/v1/monthly-review/insights?month=YYYY-MM  -> { insights: string[] }
// Keep the MonthlyInsight[] return shape so AIInsightsSlideComponent doesn't
// need to change when the real integration lands.
@Injectable({ providedIn: 'root' })
export class MonthlyInsightsService {
  private studentsService = inject(StudentsService);
  private paymentsService = inject(PaymentsService);
  private classesService = inject(ClassesService);
  private teachersService = inject(TeachersService);
  private payrollService = inject(TeacherPayrollService);
  private attendanceService = inject(AttendanceService);

  buildInsights(month: string): MonthlyInsight[] {
    const insights: MonthlyInsight[] = [];

    const monthPayments = this.paymentsService.payments().filter(p => p.periodMonth === month);
    const unpaid = monthPayments.filter(p => p.status !== 'paid');
    const unpaidStudentIds = new Set(unpaid.map(p => p.studentId));
    const amountRemaining = unpaid.reduce((sum, p) => sum + p.amount, 0);

    if (unpaidStudentIds.size > 0) {
      insights.push({
        icon: 'fa-solid fa-user-clock',
        text: `${unpaidStudentIds.size} élève${unpaidStudentIds.size > 1 ? 's' : ''} n'${unpaidStudentIds.size > 1 ? 'ont' : 'a'} pas encore payé ce mois-ci.`,
      });
      insights.push({
        icon: 'fa-solid fa-sack-dollar',
        text: `${amountRemaining.toLocaleString('fr-MA')} Dhs restent à collecter.`,
      });
    } else if (monthPayments.length > 0) {
      insights.push({
        icon: 'fa-solid fa-champagne-glasses',
        text: 'Tous les paiements du mois ont été encaissés. Excellent travail !',
      });
    }

    const salaryRows = this.payrollService.buildSalaryRows(
      this.teachersService.teachers(),
      this.classesService.classes(),
      month
    );
    const teachersUnpaid = salaryRows.filter(r => !r.paid);
    if (teachersUnpaid.length > 0) {
      insights.push({
        icon: 'fa-solid fa-chalkboard-user',
        text: `${teachersUnpaid.length} professeur${teachersUnpaid.length > 1 ? 's' : ''} reste${teachersUnpaid.length > 1 ? 'nt' : ''} à payer.`,
      });
    }

    const attendanceRate = this.attendanceService.getAttendanceRate();
    if (attendanceRate > 0) {
      insights.push({
        icon: 'fa-solid fa-chart-line',
        text: `Taux de présence global : ${attendanceRate}%.`,
      });
    }

    const topClass = this.topRevenueClass(monthPayments);
    if (topClass) {
      insights.push({
        icon: 'fa-solid fa-trophy',
        text: `${topClass.name} a généré le plus de revenus ce mois-ci (${topClass.amount.toLocaleString('fr-MA')} Dhs).`,
      });
    }

    const newStudents = this.studentsService.students().filter(s => s.createdAt?.startsWith(month));
    if (newStudents.length > 0) {
      insights.push({
        icon: 'fa-solid fa-user-plus',
        text: `${newStudents.length} nouvel${newStudents.length > 1 ? 'les' : ''} élève${newStudents.length > 1 ? 's' : ''} inscrit${newStudents.length > 1 ? 's' : ''} ce mois-ci.`,
      });
    }

    return insights;
  }

  private topRevenueClass(monthPayments: Payment[]): { name: string; amount: number } | null {
    const byClasse = new Map<number, number>();
    monthPayments
      .filter(p => p.status === 'paid')
      .forEach(p => byClasse.set(p.classeId, (byClasse.get(p.classeId) ?? 0) + p.amount));

    let best: { classeId: number; amount: number } | null = null;
    for (const [classeId, amount] of byClasse) {
      if (!best || amount > best.amount) best = { classeId, amount };
    }
    if (!best) return null;

    const classe = this.classesService.getById(best.classeId);
    if (!classe) return null;
    return { name: classe.name, amount: best.amount };
  }
}
