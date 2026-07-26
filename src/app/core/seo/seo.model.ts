/** Per-page SEO inputs passed to {@link SeoService.setPageSeo}. */
export interface PageSeo {
  /** Document <title>. Keep under ~60 chars; include the page's primary keyword. */
  title: string;
  /** Meta description. Keep ~150-160 chars; include the primary keyword naturally. */
  description: string;
  /**
   * Route path this page is served at, e.g. '/' or '/logiciel-gestion-ecole'.
   * The canonical URL is derived as `environment.siteUrl` + this path, so it is
   * always correct in dev (localhost) and prod (moujtahide.ma) without hardcoding.
   */
  path: string;
  /** Optional comma-separated keywords for the (legacy) keywords meta tag. */
  keywords?: string;
  /**
   * Optional site-relative or absolute Open Graph / Twitter image. Defaults to
   * the site-wide social image when omitted. Site-relative paths (starting '/')
   * are resolved against environment.siteUrl.
   */
  image?: string;
  /** Open Graph object type. Defaults to 'website'. */
  type?: string;
  /** robots directive. Defaults to 'index, follow, max-image-preview:large'. */
  robots?: string;
}

/** Minimal shape of a JSON-LD schema node/object passed to {@link SeoService.setSchema}. */
export type JsonLdSchema = Record<string, unknown>;
