import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../legal-layout/legal-layout.component';
import { SeoService } from '../../../core/seo/seo.service';
import { LEGAL_PAGES } from '../../../core/seo/public-pages';

@Component({
  selector: 'app-politique-cookies',
  standalone: true,
  imports: [LegalLayoutComponent, RouterLink],
  templateUrl: './politique-cookies.component.html',
  styleUrl: '../legal-shared.css',
})
export class PolitiqueCookiesComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPageSeo(LEGAL_PAGES.cookies);
  }
}
