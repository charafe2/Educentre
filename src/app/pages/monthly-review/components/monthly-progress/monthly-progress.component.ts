import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MonthlyReviewSlideConfig } from '../../../../models/monthly-review.model';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

@Component({
  selector: 'app-monthly-progress',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './monthly-progress.component.html',
  styleUrl: './monthly-progress.component.css',
})
export class MonthlyProgressComponent {
  private i18n = inject(TranslationService);

  @Input() slides: MonthlyReviewSlideConfig[] = [];
  @Input() activeIndex = 0;
  // Completion of the underlying work (salaries paid, students paid, tasks done) —
  // distinct from carousel position, per the "auto-updates as tasks complete" requirement.
  @Input() completionPercent = 0;
  @Output() stepSelect = new EventEmitter<number>();

  get stepLabel(): string {
    return this.i18n.translate('monthlyReview.step', {
      current: this.activeIndex + 1,
      total: this.slides.length,
    });
  }
}
