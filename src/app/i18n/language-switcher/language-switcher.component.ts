import { Component, HostListener, inject, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { TranslatePipe } from '../translate.pipe';
import { Lang, LANGUAGES, TranslationService } from '../translation.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [TranslatePipe, UpperCasePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.css',
})
export class LanguageSwitcherComponent {
  private translation = inject(TranslationService);

  readonly languages = LANGUAGES;
  isOpen = signal(false);

  get current(): Lang {
    return this.translation.lang();
  }

  get currentLabel(): string {
    return LANGUAGES.find(l => l.code === this.current)?.label ?? this.current;
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen.update(open => !open);
  }

  select(lang: Lang, event: Event): void {
    event.stopPropagation();
    this.translation.setLang(lang);
    this.isOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isOpen.set(false);
  }
}
