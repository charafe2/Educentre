import { Component, HostListener, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

/**
 * Top bar of the rebranded app. There is no sidebar: the brand always leads
 * back to the home page, and `section` names where the user is now. Every
 * page with a section also gets a "Retour" button to the home page — always
 * the same destination, even after a reload or from a shared link.
 */
@Component({
  selector: 'app-bar',
  imports: [RouterLink],
  template: `
    <header class="bar">
      <nav class="trail" aria-label="Fil d’Ariane">
        @if (section()) {
          <a class="back" routerLink="/accueil" aria-label="Retour à l’accueil" aria-keyshortcuts="Alt+ArrowLeft">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
            <span class="back-text">Retour</span>
          </a>
          <span class="back-sep" aria-hidden="true"></span>
        }
        <a class="brand" routerLink="/accueil" aria-label="Moujtahid, accueil">
          <span class="brand-mark" aria-hidden="true">m</span>
          <span class="brand-name">Moujtahid</span>
        </a>
        @if (section()) {
          <svg class="trail-sep" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
          <span class="trail-current" aria-current="page">{{ section() }}</span>
        }
      </nav>

      <button class="me" type="button" aria-label="Compte de Youssef Amrani">
        <span class="me-initials" aria-hidden="true">YA</span>
      </button>
    </header>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
      z-index: 2;
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      height: 72px;
      padding-inline: 32px;
    }

    .trail {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding-inline: 10px 14px;
      margin-inline-start: -10px;
      color: var(--m-ink);
      font-size: 14.5px;
      font-weight: 600;
      transition: background-color var(--m-fast) linear, color var(--m-fast) linear;
    }

    .back svg {
      width: 20px;
      height: 20px;
      transition: transform var(--m-med) var(--m-ease);
    }

    .back:hover {
      background: var(--m-green-tint);
      color: var(--m-green-deep);
    }

    /* The arrow leans the way it will take you. */
    .back:hover svg {
      transform: translateX(-3px);
    }

    .back:active svg {
      transform: translateX(-5px);
    }

    [dir='rtl'] .back svg {
      transform: scaleX(-1);
    }

    [dir='rtl'] .back:hover svg {
      transform: scaleX(-1) translateX(-3px);
    }

    .back-sep {
      width: 1px;
      height: 24px;
      margin-inline-end: 6px;
      background: var(--m-line);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      padding-block-end: 3px;
      background: var(--m-green);
      color: #fff;
      font-size: 20px;
      font-weight: 800;
      line-height: 1;
    }

    .brand-name {
      font-size: 16px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .trail-sep {
      width: 16px;
      height: 16px;
      color: var(--m-ink-faint);
    }

    [dir='rtl'] .trail-sep {
      transform: scaleX(-1);
    }

    .trail-current {
      color: var(--m-ink-soft);
      font-size: 15px;
      font-weight: 500;
      white-space: nowrap;
    }

    .me-initials {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      background: var(--m-paper);
      border: 1px solid var(--m-line);
      color: var(--m-green-deep);
      font-size: 13px;
      font-weight: 600;
      transition: border-color 150ms linear;
    }

    .me:hover .me-initials {
      border-color: var(--m-green);
    }

    @media (max-width: 560px) {
      .bar {
        height: 60px;
        padding-inline: 16px;
      }

      /* With a section shown, the mark alone is enough to find home;
         the back button keeps only its arrow, as a full 44px target. */
      .trail:has(.trail-current) .brand-name,
      .back-text {
        display: none;
      }

      .back {
        justify-content: center;
        width: 44px;
        height: 44px;
        padding: 0;
        margin-inline-start: -8px;
      }

      .back-sep {
        margin-inline-end: 2px;
      }
    }
  `,
})
export class AppBarComponent {
  readonly section = input<string>();
  private router = inject(Router);

  /** Alt + ← also goes home, like the browser's own back gesture. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.section() && event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.router.navigateByUrl('/accueil');
    }
  }
}
