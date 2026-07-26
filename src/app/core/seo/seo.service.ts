import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { JsonLdSchema, PageSeo } from './seo.model';

/**
 * Single source of truth for per-route SEO/GEO tags. Replaces the static tags in
 * index.html on a per-page basis (title, description, canonical, Open Graph,
 * Twitter, robots) and manages a JSON-LD structured-data block.
 *
 * Every DOM API used here (Meta, Title, DOCUMENT) is provided by both the
 * browser and the server platform, so this service runs correctly during
 * prerendering/SSR — the emitted static HTML already carries the right tags.
 *
 * Canonical/og:url/og:image are always built from `environment.siteUrl`, so they
 * resolve to localhost in dev and moujtahide.ma in prod with no hardcoded domains.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Identifies the <script> tag this service owns, so setSchema updates it. */
  private static readonly SCHEMA_SCRIPT_ID = 'seo-jsonld';
  /** Site-wide default social share image (relative to siteUrl). */
  private static readonly DEFAULT_OG_IMAGE = '/assets/photos/excel2.png';
  private static readonly DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

  /**
   * Sets title, meta description, canonical URL, robots, and the matching Open
   * Graph / Twitter tags for the current page. Call from a route component's
   * ngOnInit. Safe defaults guarantee no page ships without a robots directive
   * or a social image.
   */
  setPageSeo({ title, description, path, keywords, image, type, robots }: PageSeo): void {
    const canonical = this.absoluteUrl(path);
    const imageUrl = this.absoluteAsset(image ?? SeoService.DEFAULT_OG_IMAGE);

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots ?? SeoService.DEFAULT_ROBOTS });
    if (keywords) {
      this.meta.updateTag({ name: 'keywords', content: keywords });
    }

    // Keep social cards consistent with the page instead of the static homepage
    // defaults baked into index.html.
    this.meta.updateTag({ property: 'og:type', content: type ?? 'website' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

    this.setCanonical(canonical);
  }

  /**
   * Inserts or replaces the page's JSON-LD structured data. Pass a single schema
   * document, or an array of schema nodes which are combined into one @graph
   * (the recommended way to expose several types — e.g. BreadcrumbList + FAQPage
   * — on one page). Navigating replaces the previous block rather than stacking.
   */
  setSchema(schema: JsonLdSchema | JsonLdSchema[]): void {
    const payload: JsonLdSchema = Array.isArray(schema)
      ? { '@context': 'https://schema.org', '@graph': schema }
      : schema;

    const head = this.document.head;
    let script = head.querySelector<HTMLScriptElement>(`#${SeoService.SCHEMA_SCRIPT_ID}`);
    if (!script) {
      script = this.document.createElement('script');
      script.id = SeoService.SCHEMA_SCRIPT_ID;
      script.type = 'application/ld+json';
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);
  }

  /** Builds an absolute canonical URL from the configured site base + a route path. */
  private absoluteUrl(path: string): string {
    const base = environment.siteUrl.replace(/\/+$/, '');
    if (path === '/' || path === '') {
      return `${base}/`;
    }
    return `${base}/${path.replace(/^\/+/, '')}`;
  }

  /** Resolves an image reference to an absolute URL (leaves absolute URLs as-is). */
  private absoluteAsset(ref: string): string {
    if (/^https?:\/\//i.test(ref)) return ref;
    return `${environment.siteUrl.replace(/\/+$/, '')}/${ref.replace(/^\/+/, '')}`;
  }

  /** Creates or updates the single <link rel="canonical"> in <head>. */
  private setCanonical(href: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
