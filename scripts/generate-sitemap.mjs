// Build-time sitemap.xml + robots.txt generator.
//
// Runs as an npm `postbuild` step, after Angular prerendering. It scans the
// prerendered output for the pages Angular actually emitted (each public route
// produces its own <route>/index.html) and turns exactly those into sitemap
// entries. This makes the prerender route list (app.routes.server.ts) the single
// source of truth: prerender a new public route and it appears in the sitemap
// automatically — no separate list to keep in sync, and no risk of leaking a
// client-only (authenticated) route.
//
// The canonical base URL comes from src/environments/site.config.json, the same
// file the Angular app reads — no hardcoded domain here.

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const browserDir = join(projectRoot, 'dist', 'moujtahid', 'browser');
const siteConfigPath = join(projectRoot, 'src', 'environments', 'site.config.json');

/** App/utility routes that must never be indexed (mirrors app.routes.ts). */
const DISALLOW = [
  '/login',
  '/forgot-password',
  '/dashboard',
  '/revue-mensuelle',
  '/etudiants',
  '/groupes',
  '/professeurs',
  '/finances',
  '/calendrier',
  '/analytiques',
  '/documents',
  '/parametres',
  '/superadmin',
];

/** Recursively collect every prerendered `index.html` (one per public route). */
async function findPrerenderedRoutes(dir) {
  const routes = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...(await findPrerenderedRoutes(abs)));
    } else if (entry.name === 'index.html') {
      // '<browserDir>/index.html' -> '/', '<browserDir>/a/b/index.html' -> '/a/b'
      const rel = relative(browserDir, abs).replace(/\\/g, '/').replace(/\/?index\.html$/, '');
      routes.push({ path: rel === '' ? '/' : `/${rel}`, mtime: statSync(abs).mtime });
    }
  }
  return routes;
}

function priorityFor(path) {
  if (path === '/') return '1.0';
  if (DISALLOW.some(d => path.startsWith(d))) return '0.3';
  // Legal pages are lower priority than the marketing/feature pages.
  const legal = ['/politique-', '/conditions-', '/mentions-'];
  if (legal.some(p => path.startsWith(p))) return '0.3';
  return '0.8';
}

function buildSitemap(baseUrl, routes) {
  const urls = routes
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, mtime }) => {
      const loc = path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;
      const lastmod = mtime.toISOString().slice(0, 10);
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq>`,
        `    <priority>${priorityFor(path)}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildRobots(baseUrl) {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Zones privées / applicatives — non indexées',
    ...DISALLOW.map(path => `Disallow: ${path}`),
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ];
  return lines.join('\n');
}

/**
 * /llms.txt — a concise, factual, markdown summary of the site aimed at AI
 * engines (llmstxt.org convention). Kept factual and extractable; prices/contact
 * mirror the site content.
 */
function buildLlms(baseUrl) {
  return `# Moujtahid

> Moujtahid est un logiciel marocain de gestion des centres de soutien scolaire et de langues (et d'écoles privées) : gestion des élèves, présences, paiements en dirhams (MAD) et application mobile pour les parents.

Moujtahid est conçu au Maroc, en français, avec une facturation en dirhams (MAD). Il s'adresse aux centres de soutien scolaire, aux centres de langues et aux écoles privées, de Casablanca à Rabat, Marrakech et Fès. Deux formules mensuelles sont proposées, avec un essai gratuit de 30 jours.

## Pages principales
- [Accueil](${baseUrl}/) : présentation, fonctionnalités, tarifs et FAQ
- [Logiciel de gestion de centre de soutien scolaire](${baseUrl}/logiciel-gestion-centre-soutien-scolaire)
- [Logiciel de gestion de centre de langues](${baseUrl}/logiciel-gestion-centre-de-langues)
- [Logiciel de gestion d'école](${baseUrl}/logiciel-gestion-ecole)
- [Gestion des élèves](${baseUrl}/fonctionnalites/gestion-eleves)
- [Meilleur logiciel de gestion de centre au Maroc — guide](${baseUrl}/meilleur-logiciel-gestion-centre-maroc)

## Faits
- Marché : Maroc
- Langue : français
- Monnaie : dirham marocain (MAD)
- Tarifs : Débutant 189 MAD/mois, Pro 289 MAD/mois
- Essai gratuit : 30 jours
- Plateformes : Web, iOS, Android
- Contact : support@moujtahide.ma
`;
}

async function main() {
  const { siteUrl } = JSON.parse(readFileSync(siteConfigPath, 'utf8'));
  const baseUrl = siteUrl.production.replace(/\/+$/, '');

  const routes = await findPrerenderedRoutes(browserDir);
  if (routes.length === 0) {
    throw new Error(`No prerendered routes found in ${browserDir}. Did the production build run?`);
  }

  writeFileSync(join(browserDir, 'sitemap.xml'), buildSitemap(baseUrl, routes));
  writeFileSync(join(browserDir, 'robots.txt'), buildRobots(baseUrl));
  writeFileSync(join(browserDir, 'llms.txt'), buildLlms(baseUrl));

  console.log(`Sitemap: ${routes.length} routes -> ${baseUrl}/sitemap.xml`);
  console.log(`Robots:  ${baseUrl}/robots.txt`);
  console.log(`LLMs:    ${baseUrl}/llms.txt`);
}

main().catch(err => {
  console.error(`[generate-sitemap] ${err.message}`);
  process.exit(1);
});
