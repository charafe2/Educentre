import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Counts a figure up from zero the first time it renders in the browser.
 * Reactive to `countUp` changing afterward (e.g. a stat that started at 0
 * before its real, asynchronously-loaded value arrived): later changes just
 * update the figure directly, without re-running the animation \u2014 the rise
 * from zero is a first-paint flourish, not something to repeat every time
 * real data settles in behind it. It runs under reduced motion too: digits
 * changing in place move nothing across the screen.
 *
 *   <span [countUp]="18450">18 450</span>
 */
@Directive({ selector: '[countUp]' })
export class CountUpDirective {
  readonly countUp = input.required<number>();
  readonly countUpDelay = input(0);

  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private animated = false;

  private static format(n: number): string {
    return n.toLocaleString('fr-FR').replace(/\u202f/g, ' ');
  }

  constructor() {
    effect(() => {
      const target = this.countUp();
      const node = this.el.nativeElement;

      if (this.animated) {
        node.textContent = CountUpDirective.format(target);
        return;
      }
      this.animated = true;

      const duration = 900;
      node.textContent = CountUpDirective.format(0);
      setTimeout(() => {
        const start = performance.now();
        const step = (now: number) => {
          // A frame's timestamp can predate `start`: clamp, or the first
          // frame shows a negative figure.
          const t = Math.max(0, Math.min(1, (now - start) / duration));
          const eased = 1 - Math.pow(1 - t, 4);
          node.textContent = CountUpDirective.format(t < 1 ? Math.round(target * eased) : target);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, this.countUpDelay());
    });
  }
}
