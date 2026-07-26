import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';

@Component({
  selector: 'app-gestion-ecole',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink],
  templateUrl: './gestion-ecole.component.html',
  styleUrl: '../marketing-shared.css',
})
export class GestionEcoleComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPageSeo(PUBLIC_PAGES.school);
  }
}
