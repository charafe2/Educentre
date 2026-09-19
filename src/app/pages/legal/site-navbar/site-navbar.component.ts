import { Component, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FlagLanguageSwitcherComponent } from '../../../i18n/flag-language-switcher/flag-language-switcher.component';

@Component({
  selector: 'app-site-navbar',
  standalone: true,
  imports: [RouterLink, FlagLanguageSwitcherComponent],
  templateUrl: './site-navbar.component.html',
  styleUrl: './site-navbar.component.css',
})
export class SiteNavbarComponent {
  scrolled = signal(false);
  mobileMenuOpen = signal(false);

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 80);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
