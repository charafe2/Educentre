import { Component, OnInit, inject } from '@angular/core';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs } from '../../../core/seo/schema';

/**
 * Blog index. There are no individual posts yet, so this page links out to
 * the existing guide/comparison pages instead of shipping as an empty
 * placeholder (a thin/empty page would be its own SEO problem).
 *
 * When real posts exist: add each as its own routed component under
 * pages/marketing/blog/posts/<slug>/, following the same pattern as the other
 * marketing pages (its own entry in public-pages.ts, its own route here and
 * in app.routes.server.ts for prerendering), and list them in this
 * component/template above the "Nos guides et comparatifs" section rather
 * than replacing it.
 */
@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [MarketingLayoutComponent, RelatedPagesComponent],
  templateUrl: './blog.component.html',
  styleUrl: '../marketing-shared.css',
})
export class BlogComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.blog;

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema(
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Blog', path: this.page.path },
      ]),
    );
  }
}
