import { Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingPage, OnboardingService } from './onboarding.service';

/**
 * The onboarding's anchor on every page it spans: a small checklist in the
 * corner that ticks itself as the centre gets set up. Dropping it into a page
 * also registers that page with the guide.
 */
@Component({
  selector: 'app-onboarding',
  imports: [RouterLink],
  template: `
    @if (ob.active() && !ob.celebrate()) {
      @if (!ob.hidden()) {
        <aside class="card" aria-labelledby="ob-title" animate.enter="card-enter" animate.leave="card-leave">
          <header class="head">
            <p id="ob-title" class="title">Lancer votre centre</p>
            <span class="count">{{ ob.doneCount() }}/3</span>
          </header>
          <span class="bar" aria-hidden="true"><span class="bar-fill" [style.transform]="'scaleX(' + ob.doneCount() / 3 + ')'"></span></span>

          <ol class="steps">
            @for (s of ob.steps(); track s.key; let i = $index) {
              <li class="step" [class.is-done]="s.done" [class.is-current]="ob.current()?.key === s.key">
                <span class="mark" aria-hidden="true">
                  @if (s.done) {
                    <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="step-text">
                  @if (ob.current()?.key === s.key) {
                    <a [routerLink]="s.route">{{ s.label }}</a>
                  } @else {
                    <span>{{ s.label }}</span>
                  }
                  <small>{{ s.done ? 'Fait' : s.hint }}</small>
                </span>
              </li>
            }
          </ol>

          <footer class="foot">
            <button class="m-btn m-btn--primary" type="button" (click)="ob.resume()">Me guider</button>
            <button class="later" type="button" (click)="ob.hide()">Plus tard</button>
          </footer>
        </aside>
      } @else {
        <button class="pill" type="button" animate.enter="card-enter" (click)="ob.resume()" [attr.aria-label]="'Reprendre le démarrage, ' + ob.doneCount() + ' étapes sur 3 faites'">
          <span class="ring" [style.--p]="ob.doneCount() / 3" aria-hidden="true"></span>
          Démarrage {{ ob.doneCount() }}/3
        </button>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset-block-end: 20px;
      inset-inline-start: 20px;
      z-index: 15;
      display: block;
    }

    .card {
      width: 300px;
      overflow: clip;
      background: var(--m-paper);
      border: 1px solid var(--m-line);
      border-block-start: 3px solid var(--m-green);
      border-radius: var(--m-r);
      box-shadow: var(--m-shadow-lg);
    }

    .card-enter {
      animation: card-in var(--m-slow) var(--m-ease) both;
    }

    .card-leave {
      animation: card-out var(--m-med) var(--m-ease) both;
    }

    @keyframes card-in {
      from { opacity: 0; transform: translateY(12px); }
    }

    @keyframes card-out {
      to { opacity: 0; transform: translateY(8px); }
    }

    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      padding: 14px 16px 10px;
    }

    .title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .count {
      color: var(--m-green-deep);
      font-size: 13px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .bar {
      display: block;
      height: 4px;
      margin-inline: 16px;
      overflow: clip;
      border-radius: var(--m-r-pill);
      background: var(--m-line-soft);
    }

    .bar-fill {
      display: block;
      height: 100%;
      background: var(--m-green);
      transform-origin: left;
      transition: transform var(--m-slow) var(--m-ease);
    }

    [dir='rtl'] .bar-fill {
      transform-origin: right;
    }

    .steps {
      margin: 0;
      padding: 10px 8px 6px;
      list-style: none;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px;
      border-radius: var(--m-r-sm);
      transition: background-color var(--m-med) linear;
    }

    .step.is-current {
      background: var(--m-green-tint);
    }

    .mark {
      display: grid;
      place-items: center;
      flex: none;
      width: 22px;
      height: 22px;
      border: 1.5px solid var(--m-line-strong);
      border-radius: 50%;
      color: var(--m-ink-soft);
      font-size: 12px;
      font-weight: 700;
      transition: background-color var(--m-med) var(--m-ease), border-color var(--m-med) var(--m-ease);
    }

    .mark svg {
      width: 14px;
      height: 14px;
      stroke-width: 2.6;
      stroke-dasharray: 22;
      animation: tick var(--m-slow) var(--m-ease) both;
    }

    @keyframes tick {
      from { stroke-dashoffset: 22; }
    }

    .step.is-current .mark {
      border-color: var(--m-green);
      color: var(--m-green-deep);
    }

    .step.is-done .mark {
      border-color: var(--m-green);
      background: var(--m-green);
      color: #fff;
    }

    .step-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font-size: 14px;
      font-weight: 600;
    }

    .step.is-done .step-text > span {
      color: var(--m-ink-soft);
      text-decoration: line-through;
      text-decoration-color: var(--m-line-strong);
    }

    .step-text a {
      color: var(--m-green-deep);
      text-decoration: underline;
      text-decoration-color: transparent;
      text-underline-offset: 3px;
      transition: text-decoration-color var(--m-fast) linear;
    }

    .step-text a:hover {
      text-decoration-color: currentColor;
    }

    .step-text small {
      color: var(--m-ink-faint);
      font-size: 12.5px;
      font-weight: 500;
    }

    .foot {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px 14px;
    }

    .foot .m-btn {
      height: 36px;
      font-size: 13.5px;
    }

    .later {
      height: 36px;
      padding-inline: 10px;
      border-radius: var(--m-r-sm);
      color: var(--m-ink-soft);
      font-size: 13.5px;
      font-weight: 600;
      transition: color var(--m-fast) linear;
    }

    .later:hover {
      color: var(--m-ink);
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      height: 42px;
      padding-inline: 12px 16px;
      border-radius: var(--m-r-pill);
      background: var(--m-ink);
      color: #fff;
      font-size: 13.5px;
      font-weight: 600;
      box-shadow: 0 10px 24px -14px rgba(22, 40, 31, 0.6);
      transition: transform var(--m-fast) var(--m-ease);
    }

    .pill:hover {
      transform: translateY(-1px);
    }

    .ring {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: conic-gradient(#6ee7a8 calc(var(--p) * 360deg), rgba(255, 255, 255, 0.2) 0);
      mask: radial-gradient(circle, transparent 5px, #000 5.5px);
    }

    @media (max-width: 720px) {
      :host {
        inset-block-end: 12px;
        inset-inline: 12px auto;
      }

      .card {
        width: min(320px, calc(100vw - 24px));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .card-enter,
      .card-leave,
      .mark svg {
        animation-duration: 1ms;
      }
    }
  `,
})
export class OnboardingChecklistComponent implements OnInit {
  readonly page = input.required<OnboardingPage>();
  readonly ob = inject(OnboardingService);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const page = this.page();
    this.ob.enter(page);
    this.destroyRef.onDestroy(() => this.ob.leave(page));
  }
}
