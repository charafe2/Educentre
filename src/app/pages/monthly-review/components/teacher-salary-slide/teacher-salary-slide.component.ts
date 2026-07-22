import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TeacherCardComponent } from '../teacher-card/teacher-card.component';
import { TeachersService } from '../../../../services/teachers.service';
import { ClassesService } from '../../../../services/classes.service';
import { TeacherPayrollService } from '../../../../services/teacher-payroll.service';
import { ToastService } from '../../../../services/toast.service';
import { currentMonthKey } from '../../../../utils/current-month.util';
import { TeacherSalaryRow } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-teacher-salary-slide',
  standalone: true,
  imports: [TeacherCardComponent, TranslatePipe],
  templateUrl: './teacher-salary-slide.component.html',
  styleUrls: ['../slide-shell.css', './teacher-salary-slide.component.css'],
})
export class TeacherSalarySlideComponent {
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private payrollService = inject(TeacherPayrollService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private i18n = inject(TranslationService);

  private month = currentMonthKey();

  private allRows = computed<TeacherSalaryRow[]>(() =>
    this.payrollService.buildSalaryRows(
      this.teachersService.teachers(),
      this.classesService.classes(),
      this.month
    )
  );

  unpaidRows = computed(() => this.allRows().filter(r => !r.paid));
  paidCount = computed(() => this.allRows().filter(r => r.paid).length);
  totalOwed = computed(() => this.unpaidRows().reduce((sum, r) => sum + r.amountOwed, 0));
  allPaid = computed(() => this.allRows().length > 0 && this.unpaidRows().length === 0);

  markPaid(row: TeacherSalaryRow): void {
    this.payrollService.markAsPaid(row.teacherId, this.month);
    this.toast.show(this.i18n.translate('monthlyReview.salaries.paidToast', {
      name: `${row.firstName} ${row.lastName}`,
    }));
  }

  viewDetails(row: TeacherSalaryRow): void {
    // TODO: deep-link to this specific teacher once /professeurs supports a detail route.
    void row;
    this.router.navigate(['/professeurs']);
  }
}
