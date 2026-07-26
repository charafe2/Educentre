import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Per-route render strategy for the build. Only the public marketing/legal
 * pages are prerendered to static HTML (great SEO, served by nginx with no Node
 * runtime). Everything else — login, the authenticated tenant app, superadmin —
 * stays client-rendered and is served via the SPA fallback.
 *
 * The set of Prerender routes here is the single source of truth for what ends
 * up in the sitemap (scripts/generate-sitemap.mjs reads the prerendered output).
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'logiciel-gestion-centre-soutien-scolaire', renderMode: RenderMode.Prerender },
  { path: 'logiciel-gestion-ecole', renderMode: RenderMode.Prerender },
  { path: 'logiciel-gestion-centre-de-langues', renderMode: RenderMode.Prerender },
  { path: 'fonctionnalites/gestion-eleves', renderMode: RenderMode.Prerender },
  { path: 'meilleur-logiciel-gestion-centre-maroc', renderMode: RenderMode.Prerender },
  { path: 'politique-de-confidentialite', renderMode: RenderMode.Prerender },
  { path: 'conditions-generales-utilisation', renderMode: RenderMode.Prerender },
  { path: 'politique-de-cookies', renderMode: RenderMode.Prerender },
  { path: 'mentions-legales', renderMode: RenderMode.Prerender },

  // Login, tenant dashboard, superadmin and any other route: client-rendered.
  { path: '**', renderMode: RenderMode.Client },
];
