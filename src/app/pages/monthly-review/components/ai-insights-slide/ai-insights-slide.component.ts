import { Component, computed, inject } from '@angular/core';
import { MonthlyInsightsService } from '../../../../services/monthly-insights.service';
import { currentMonthKey } from '../../../../utils/current-month.util';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { TranslationService } from '../../../../i18n/translation.service';

const LOCALE_BY_LANG = { fr: 'fr-MA', ar: 'ar-MA', en: 'en-GB' } as const;

@Component({
  selector: 'app-ai-insights-slide',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './ai-insights-slide.component.html',
  styleUrls: ['../slide-shell.css', './ai-insights-slide.component.css'],
})
export class AIInsightsSlideComponent {
  private insightsService = inject(MonthlyInsightsService);
  private i18n = inject(TranslationService);
  private month = currentMonthKey();

  insights = computed(() => this.insightsService.buildInsights(this.month));

  get monthLabel(): string {
    const locale = LOCALE_BY_LANG[this.i18n.lang()];
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(`${this.month}-01`));
  }
}
