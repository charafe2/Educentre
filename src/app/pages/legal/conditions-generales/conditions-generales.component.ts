import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../legal-layout/legal-layout.component';
import { SeoService } from '../../../core/seo/seo.service';
import { LEGAL_PAGES } from '../../../core/seo/public-pages';

@Component({
  selector: 'app-conditions-generales',
  standalone: true,
  imports: [LegalLayoutComponent, RouterLink],
  templateUrl: './conditions-generales.component.html',
  styleUrl: '../legal-shared.css',
})
export class ConditionsGeneralesComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPageSeo(LEGAL_PAGES.terms);
  }
}
