import { Pipe, PipeTransform, inject, ChangeDetectorRef, effect } from '@angular/core';
import { TranslationService } from './translation.service';

// Usage in templates:
//   {{ 'nav.students' | t }}
//   {{ 'dashboard.totalEnrolled' | t: { count: 42 } }}
//
// This app is zoneless, so an impure pipe reading a signal does NOT register
// that signal as a dependency of the host view — changing the language would
// otherwise leave the rendered text stale. The effect below reads the `lang`
// signal (tracked) and marks the host view for check whenever it changes, so
// the impure pipe re-runs and returns the newly-translated string.
@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private translation = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.translation.lang();
      this.cdr.markForCheck();
    });
  }

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translation.translate(key, params);
  }
}
