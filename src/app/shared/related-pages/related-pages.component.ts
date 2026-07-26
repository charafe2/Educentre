import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

interface RelatedLink {
  path: string;
  label: string;
}

/** The vertical/feature pages that form Moujtahid's topical cluster. */
const VERTICALS: ReadonlyArray<RelatedLink> = [
  { path: '/logiciel-gestion-centre-soutien-scolaire', label: 'Gestion de centre de soutien scolaire' },
  { path: '/logiciel-gestion-centre-de-langues', label: 'Gestion de centre de langues' },
  { path: '/logiciel-gestion-ecole', label: "Gestion d'école" },
  { path: '/fonctionnalites/gestion-eleves', label: 'Gestion des élèves' },
  { path: '/meilleur-logiciel-gestion-centre-maroc', label: 'Bien choisir son logiciel de gestion de centre' },
];

/**
 * Cross-links the related vertical/feature pages (topical-cluster internal
 * linking, good for both crawlers and generative engines). Excludes the current
 * page. Rendered as a real <nav> with descriptive link text.
 */
@Component({
  selector: 'app-related-pages',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="related" aria-label="Pages liées">
      <h2 class="related__title">{{ title }}</h2>
      <ul class="related__list">
        @for (link of links; track link.path) {
          <li>
            <a [routerLink]="link.path" class="related__link">
              {{ link.label }}
              <span class="related__arrow" aria-hidden="true">→</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .related { margin-top: clamp(2.5rem, 6vw, 4rem); }
    .related__title {
      font-family: var(--font-ui);
      font-size: clamp(1.1rem, 2.4vw, 1.35rem);
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 1rem;
    }
    .related__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.75rem;
    }
    .related__link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1.1rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--surface);
      color: var(--text-main);
      font-family: var(--font-ui);
      font-weight: 700;
      font-size: 0.95rem;
      text-decoration: none;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .related__link:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
    }
    .related__arrow { color: var(--primary); }
  `],
})
export class RelatedPagesComponent {
  /** Route path of the current page, excluded from the list. */
  @Input() currentPath = '';
  @Input() title = 'Explorez aussi';

  get links(): ReadonlyArray<RelatedLink> {
    return VERTICALS.filter(link => link.path !== this.currentPath);
  }
}
