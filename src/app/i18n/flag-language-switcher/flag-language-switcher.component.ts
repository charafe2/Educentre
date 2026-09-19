import { Component, HostListener, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Lang, LANGUAGES, TranslationService } from '../translation.service';

// Flag-based language dropdown for the marketing landing nav.
// Uses inline SVG flags (emoji flags don't render on Windows), wired to the
// same TranslationService as the rest of the app so the choice persists.
@Component({
  selector: 'app-flag-language-switcher',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './flag-language-switcher.component.html',
  styleUrl: './flag-language-switcher.component.css',
})
export class FlagLanguageSwitcherComponent {
  private translation = inject(TranslationService);

  readonly languages = LANGUAGES;
  isOpen = signal(false);

  get current(): Lang {
    return this.translation.lang();
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
