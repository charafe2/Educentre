import { Component, Input } from '@angular/core';
import { FaqItem } from '../../core/seo/schema';

/**
 * Reusable FAQ block rendered as native <details>/<summary> accordions: the
 * answers are real, in-DOM, user-expandable content (no display:none / cloaking).
 * The SAME `items` array is passed to buildFaqSchema() by the host page so the
 * FAQPage structured data always matches what visitors see.
 *
 * `headingId` lets the host tie the section to the page heading hierarchy.
 */
@Component({
  selector: 'app-faq-section',
  standalone: true,
  template: `
    <section class="faq" [attr.aria-labelledby]="headingId">
      <h2 [id]="headingId" class="faq__title">{{ title }}</h2>
      <div class="faq__list">
        @for (item of items; track item.question) {
          <details class="faq__item" name="faq">
            <summary class="faq__q">
              <span>{{ item.question }}</span>
              <span class="faq__icon" aria-hidden="true"></span>
            </summary>
            <div class="faq__a"><p>{{ item.answer }}</p></div>
          </details>
        }
      </div>
    </section>
  `,
  styles: [`
    .faq { margin-top: clamp(2.5rem, 6vw, 4rem); }
    .faq__title {
      font-family: var(--font-ui);
      font-size: clamp(1.35rem, 3vw, 1.75rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-main);
      margin: 0 0 1.25rem;
    }
    .faq__list { display: flex; flex-direction: column; gap: 0.6rem; }
    .faq__item {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--surface);
      overflow: hidden;
    }
    .faq__q {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
      padding: 1rem 1.2rem;
      font-family: var(--font-ui);
      font-weight: 700;
      color: var(--text-main);
      list-style: none;
    }
    .faq__q::-webkit-details-marker { display: none; }
    .faq__icon {
      position: relative;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
    }
    .faq__icon::before,
    .faq__icon::after {
      content: '';
      position: absolute;
      background: var(--primary);
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .faq__icon::before { top: 7px; left: 0; width: 16px; height: 2px; }
    .faq__icon::after { top: 0; left: 7px; width: 2px; height: 16px; }
    details[open] .faq__icon::after { transform: rotate(90deg); opacity: 0; }
    .faq__a {
      padding: 0 1.2rem 1.1rem;
      color: var(--text-light);
      line-height: 1.65;
    }
    .faq__a p { margin: 0; }
  `],
})
export class FaqSectionComponent {
  @Input({ required: true }) items: ReadonlyArray<FaqItem> = [];
  @Input() title = 'Questions fréquentes';
  @Input() headingId = 'faq-heading';
}
