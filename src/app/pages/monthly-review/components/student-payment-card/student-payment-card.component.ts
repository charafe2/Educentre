import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { StudentPaymentRow } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-student-payment-card',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './student-payment-card.component.html',
  styleUrl: './student-payment-card.component.css',
})
export class StudentPaymentCardComponent {
  private i18n = inject(TranslationService);

  @Input({ required: true }) row!: StudentPaymentRow;
  @Output() markPaid = new EventEmitter<void>();
  @Output() contactParent = new EventEmitter<void>();
  @Output() viewStudent = new EventEmitter<void>();

  get initials(): string {
    const parts = this.row.studentName.split(' ');
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }

  get formattedAmount(): string {
    return `${this.row.amount.toLocaleString('fr-MA')} ${this.i18n.translate('common.currency')}`;
  }

  get formattedDueDate(): string {
    return new Intl.DateTimeFormat('fr-MA', { day: 'numeric', month: 'short' }).format(new Date(this.row.dueDate));
  }
}
