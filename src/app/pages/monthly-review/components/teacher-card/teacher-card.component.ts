import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { TeacherSalaryRow } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-teacher-card',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './teacher-card.component.html',
  styleUrl: './teacher-card.component.css',
})
export class TeacherCardComponent {
  private i18n = inject(TranslationService);

  @Input({ required: true }) row!: TeacherSalaryRow;
  @Output() markPaid = new EventEmitter<void>();
  @Output() viewDetails = new EventEmitter<void>();

  get initials(): string {
    return (this.row.firstName[0] ?? '') + (this.row.lastName[0] ?? '');
  }

  get formattedAmount(): string {
    return `${this.row.amountOwed.toLocaleString('fr-MA')} ${this.i18n.translate('common.currency')}`;
  }
}
