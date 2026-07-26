import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';

@Component({
  selector: 'app-centre-de-langues',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink],
  templateUrl: './centre-de-langues.component.html',
  styleUrl: '../marketing-shared.css',
})
export class CentreDeLanguesComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPageSeo(PUBLIC_PAGES.languageCenter);
  }
}
