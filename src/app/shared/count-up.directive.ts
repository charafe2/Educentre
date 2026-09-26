import { Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Counts a figure up from zero once, on first render in the browser.
 * The element's text is the final value throughout SSR; only the animation
 * frames rewrite it. It runs under reduced motion too: digits changing in
 * place move nothing across the screen.
 *
 *   <span [countUp]="18450">18 450</span>
 */
@Directive({ selector: '[countUp]' })
export class CountUpDirective {
  readonly countUp = input.required<number>();
  readonly countUpDelay = input(0);

  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => {
      const target = this.countUp();
      const node = this.el.nativeElement;
      const final = node.textContent ?? '';
      const format = (n: number) => n.toLocaleString('fr-FR').replace(/\u202f/g, ' ');
      const duration = 900;

      node.textContent = format(0);
      setTimeout(() => {
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          node.textContent = t < 1 ? format(Math.round(target * eased)) : final;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, this.countUpDelay());
    });
  }
}
