import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteNavbarComponent } from '../../legal/site-navbar/site-navbar.component';
import { SiteFooterComponent } from '../../legal/site-footer/site-footer.component';

/**
 * Shared shell for the SEO marketing landing pages: reuses the site navbar and
 * footer, wraps the page's own content (<ng-content>) and appends a common CTA
 * band. Each page supplies its own keyword-rich hero so the H1/first paragraph
 * stay page-specific and easy to review.
 */
@Component({
  selector: 'app-marketing-layout',
  standalone: true,
  imports: [RouterLink, SiteNavbarComponent, SiteFooterComponent],
  templateUrl: './marketing-layout.component.html',
  styleUrl: '../marketing-shared.css',
})
export class MarketingLayoutComponent {}
