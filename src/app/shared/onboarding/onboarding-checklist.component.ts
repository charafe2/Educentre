import { Component, DestroyRef, inject, input, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OnboardingPage, OnboardingService } from './onboarding.service';

/**
 * The onboarding's anchor on every page it spans: a tab folded against the
 * left edge, showing progress at a glance and unfolding into the full
 * "getting started" checklist on click. Dropping it into a page also
 * registers that page with the guide (see OnboardingService).
 */
@Component({
  selector: 'app-onboarding',
  imports: [RouterLink],
  template: `
    @if (ob.active() && !ob.celebrate()) {
      <div class="dock" [class.is-open]="expanded()">
        <button
          class="tab" type="button"
          (click)="toggle()"
          aria-haspopup="true" aria-controls="ob-panel"
          [attr.aria-expanded]="expanded()"
          [attr.aria-label]="(expanded() ? 'Fermer' : 'Ouvrir') + ' le guide de démarrage, ' + ob.doneCount() + ' étapes sur ' + ob.steps().length + ' faites'"
        >
          <span class="tab-ring" [style.--p]="ob.doneCount() / ob.steps().length" aria-hidden="true"></span>
          <span class="tab-label">Démarrage</span>
          <svg class="tab-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </button>

        @if (expanded()) {
          <aside id="ob-panel" class="panel" aria-labelledby="ob-title" animate.enter="panel-enter" animate.leave="panel-leave">
            <header class="head">
              <p id="ob-title" class="title">Lancer votre centre</p>
              <span class="count">{{ ob.doneCount() }}/{{ ob.steps().length }}</span>
            </header>
            <span class="bar" aria-hidden="true"><span class="bar-fill" [style.transform]="'scaleX(' + ob.doneCount() / ob.steps().length + ')'"></span></span>

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
                      <a [routerLink]="s.route" (click)="expanded.set(false)">{{ s.label }}</a>
                    } @else {
                      <span>{{ s.label }}</span>
                    }
                    <small>{{ s.done ? 'Fait' : s.hint }}</small>
                  </span>
                </li>
              }
            </ol>

            <footer class="foot">
              <button class="m-btn m-btn--primary" type="button" (click)="guide()">Me guider</button>
              <button class="later" type="button" (click)="later()">Plus tard</button>
            </footer>
          </aside>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .dock {
      position: fixed;
      inset-block-start: 50%;
      inset-inline-start: 0;
      z-index: 15;
      display: flex;
      align-items: flex-start;
      transform: translateY(-50%);
    }

    /* ── Folded tab ───────────────────────────────────────────────────── */

    .tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      width: 40px;
      padding: 14px 0 12px;
      background: var(--m-paper);
      border: 1px solid var(--m-line);
      border-inline-start: none;
      border-radius: 0 var(--m-r) var(--m-r) 0;
      box-shadow: var(--m-shadow-lg);
      transition: background-color var(--m-fast) linear, width var(--m-fast) linear;
    }

    .tab:hover {
      background: var(--m-green-tint);
    }

    .dock.is-open .tab {
      border-inline-end: 1px solid var(--m-line);
    }

    .tab-ring {
      flex: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: conic-gradient(var(--m-green) calc(var(--p) * 360deg), var(--m-line-soft) 0);
      mask: radial-gradient(circle, transparent 5px, #000 5.5px);
    }

    .tab-label {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      color: var(--m-ink);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }

    .tab-chevron {
      width: 15px;
      height: 15px;
      color: var(--m-ink-faint);
      transition: transform var(--m-med) var(--m-ease);
    }

    .dock.is-open .tab-chevron {
      transform: rotate(180deg);
    }

    [dir='rtl'] .tab {
      border-radius: var(--m-r) 0 0 var(--m-r);
      border-inline-start: 1px solid var(--m-line);
      border-inline-end: none;
    }

    [dir='rtl'] .dock.is-open .tab {
      border-inline-start: 1px solid var(--m-line);
    }

    [dir='rtl'] .tab-chevron {
      transform: scaleX(-1);
    }

    [dir='rtl'] .dock.is-open .tab-chevron {
      transform: scaleX(-1) rotate(180deg);
    }

    /* ── Unfolded panel ───────────────────────────────────────────────── */

    .panel {
      width: 300px;
      overflow: clip;
      background: var(--m-paper);
      border: 1px solid var(--m-line);
      border-inline-start: none;
      border-block-start: 3px solid var(--m-green);
      border-radius: 0 var(--m-r) var(--m-r) 0;
      box-shadow: var(--m-shadow-lg);
    }

    [dir='rtl'] .panel {
      border-inline-start: 1px solid var(--m-line);
      border-inline-end: none;
      border-radius: var(--m-r) 0 0 var(--m-r);
    }

    .panel-enter {
      animation: panel-in var(--m-med) var(--m-ease) both;
    }

    .panel-leave {
      animation: panel-out var(--m-fast) var(--m-ease) both;
    }

    @keyframes panel-in {
      from { opacity: 0; transform: translateX(-10px); }
    }

    [dir='rtl'] .panel-enter {
      animation-name: panel-in-rtl;
    }

    @keyframes panel-in-rtl {
      from { opacity: 0; transform: translateX(10px); }
    }

    @keyframes panel-out {
      to { opacity: 0; transform: translateX(-8px); }
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
      max-height: 50vh;
      overflow-y: auto;
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

    @media (max-width: 720px) {
      .panel {
        width: min(300px, calc(100vw - 56px));
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel-enter,
      .panel-leave,
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

  /** Folded by default — a reference the owner opens when they want it, not a modal in their way. */
  readonly expanded = signal(false);

  ngOnInit(): void {
    const page = this.page();
    this.ob.enter(page);
    this.destroyRef.onDestroy(() => this.ob.leave(page));
  }

  toggle(): void {
    this.expanded.update(v => !v);
  }

  guide(): void {
    this.ob.resume();
  }

  later(): void {
    this.ob.hide();
    this.expanded.set(false);
  }
}
