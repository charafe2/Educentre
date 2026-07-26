import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';

@Component({
  selector: 'app-gestion-eleves',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink],
  templateUrl: './gestion-eleves.component.html',
  styleUrl: '../marketing-shared.css',
})
export class GestionElevesComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.setPageSeo(PUBLIC_PAGES.studentManagement);
  }
}
