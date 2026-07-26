import siteConfig from './site.config.json';

// Dev environment. `siteUrl` is the canonical base used for <link rel="canonical">,
// og:url, sitemap entries, etc. It is the single source of truth shared with the
// production build (environment.prod.ts) and the sitemap generator via
// src/environments/site.config.json — never hardcode a domain anywhere else.
export const environment = {
  production: false,
  apiUrl: '/api',
  siteUrl: siteConfig.siteUrl.development,
};
