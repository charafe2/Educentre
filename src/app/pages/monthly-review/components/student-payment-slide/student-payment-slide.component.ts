import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentPaymentCardComponent } from '../student-payment-card/student-payment-card.component';
import { PaymentsService } from '../../../../services/payments.service';
import { StudentsService } from '../../../../services/students.service';
import { ClassesService } from '../../../../services/classes.service';
import { TeachersService } from '../../../../services/teachers.service';
import { ToastService } from '../../../../services/toast.service';
import { currentMonthKey } from '../../../../utils/current-month.util';
import { StudentPaymentRow } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

// Convention used until Payment gains an explicit due-date field: tuition is
// considered due on the 5th of its billing month.
const DUE_DAY = 5;

@Component({
  selector: 'app-student-payment-slide',
  standalone: true,
  imports: [FormsModule, StudentPaymentCardComponent, TranslatePipe],
  templateUrl: './student-payment-slide.component.html',
  styleUrls: ['../slide-shell.css', './student-payment-slide.component.css'],
})
export class StudentPaymentSlideComponent {
  private paymentsService = inject(PaymentsService);
  private studentsService = inject(StudentsService);
  private classesService = inject(ClassesService);
  private teachersService = inject(TeachersService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private i18n = inject(TranslationService);

  private month = currentMonthKey();

  search = signal('');
  classeFilter = signal<number | ''>('');
  teacherFilter = signal<number | ''>('');

  classes = this.classesService.classes;
  teachers = this.teachersService.teachers;

  private unpaidRows = computed<StudentPaymentRow[]>(() => {
    const students = this.studentsService.students();
    const classes = this.classesService.classes();
    const teachers = this.teachersService.teachers();

    return this.paymentsService.payments()
      .filter(p => p.periodMonth === this.month && p.status !== 'paid')
      .map((payment): StudentPaymentRow | null => {
        const student = students.find(s => s.id === payment.studentId);
        const classe = classes.find(c => c.id === payment.classeId);
        if (!student || !classe) return null;
        const teacher = teachers.find(t => t.id === classe.teacherId);

        return {
          paymentId: payment.id,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          avatarColor: student.avatarColor,
          className: classe.name,
          classeId: classe.id,
          teacherId: classe.teacherId,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : '-',
          amount: payment.amount,
          dueDate: `${this.month}-${String(DUE_DAY).padStart(2, '0')}`,
          phone: student.parentWhatsapp || student.parentPhone,
        };
      })
      .filter((row): row is StudentPaymentRow => row !== null);
  });

  filteredRows = computed(() => {
    const search = this.search().trim().toLocaleLowerCase('fr-FR');
    const classeId = this.classeFilter();
    const teacherId = this.teacherFilter();

    return this.unpaidRows().filter(row => {
      if (search && !row.studentName.toLocaleLowerCase('fr-FR').includes(search)) return false;
      if (classeId !== '' && row.classeId !== classeId) return false;
      if (teacherId !== '' && row.teacherId !== teacherId) return false;
      return true;
    });
  });

  totalDue = computed(() => this.unpaidRows().reduce((sum, r) => sum + r.amount, 0));
  allPaid = computed(() => this.unpaidRows().length === 0);

  markPaid(row: StudentPaymentRow): void {
    this.paymentsService.markAsPaid(row.paymentId, 'Espèces').subscribe({
      next: () => this.toast.show(this.i18n.translate('monthlyReview.payments.paidToast', { name: row.studentName })),
      error: () => this.toast.show('Impossible de marquer ce paiement comme payé', 'error'),
    });
  }

  contactParent(row: StudentPaymentRow): void {
    if (!row.phone) {
      this.toast.show(this.i18n.translate('monthlyReview.payments.noContact'), 'error');
      return;
    }
    const digits = row.phone.replace(/\D/g, '');
    const intl = digits.startsWith('212') ? digits : '212' + digits.replace(/^0/, '');
    const msg = `Bonjour, nous vous rappelons que le paiement de *${row.studentName}* (${row.className}) est actuellement en attente. Merci de bien vouloir régulariser la situation.`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  viewStudent(row: StudentPaymentRow): void {
    // TODO: deep-link to this specific student once /etudiants supports a detail route.
    void row;
    this.router.navigate(['/etudiants']);
  }
}
