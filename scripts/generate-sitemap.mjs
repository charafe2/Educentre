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

/**
 * AI crawlers that fetch/train on or answer from web content (ChatGPT,
 * Gemini/Google's AI features, Claude, Perplexity, Common Crawl — used by
 * most model training pipelines). None of these need their own robots.txt
 * block: `User-agent: *` below already allows all of them (a UA-specific
 * block only matters when it needs *different* rules than the wildcard —
 * repeating the same Allow/Disallow per bot would just be dead weight).
 * Listed here purely so the intent is on record: this site wants to be
 * readable and citable by AI answer engines, should that ever need to
 * change for one of them specifically.
 */
const AI_CRAWLERS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', // OpenAI / ChatGPT
  'Google-Extended', // Gemini / Google AI features training + grounding
  'ClaudeBot', 'Claude-Web', 'anthropic-ai', // Anthropic / Claude
  'PerplexityBot', 'Perplexity-User', // Perplexity
  'CCBot', // Common Crawl — feeds most LLM pretraining corpora
  'Applebot-Extended', // Apple Intelligence
  'Bingbot', // Bing / Copilot
];

function buildRobots(baseUrl) {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Zones privées / applicatives — non indexées',
    ...DISALLOW.map(path => `Disallow: ${path}`),
    '',
    `# AI answer engines (${AI_CRAWLERS.join(', ')}) are welcomed here —`,
    '# covered by User-agent: * above, no special-casing needed.',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ];
  return lines.join('\n');
}

/**
 * Pricing/feature facts, kept in one place so /llms.txt and /llms-full.txt
 * stay consistent with each other. MUST mirror the pricing cards in
 * src/app/pages/hero/hero.component.html and PRICING in
 * src/app/core/seo/schema.ts (that file drives the on-page JSON-LD; this
 * one drives the plain-text AI-facing files — same source content, kept in
 * two places on purpose since this script can't import Angular TS).
 */
const PLANS = [
  {
    name: 'Débutant',
    price: '189 MAD/mois',
    features: ["jusqu'à 50 élèves", '5 comptes enseignants', 'planification de base', 'suivi des présences', 'assistance par e-mail'],
  },
  {
    name: 'Pro',
    price: '289 MAD/mois',
    features: ["jusqu'à 300 élèves", 'comptes enseignants illimités', 'planification intelligente avec détection de conflits', 'paiements et facturation', 'analyses avancées', 'assistance prioritaire'],
  },
  {
    name: 'Entreprise',
    price: 'sur devis',
    features: ['élèves et enseignants illimités', 'gestion multi-sites', 'intégrations personnalisées et API', 'responsable de compte dédié', 'garantie SLA'],
  },
];

const FEATURES = [
  { name: 'Planification intelligente', body: "Planification par glisser-déposer qui résout automatiquement les conflits de salles, d'enseignants et d'élèves." },
  { name: 'Suivi des présences', body: 'Présence marquée en un appui par élève ; alertes SMS automatiques aux parents en cas d\'absence.' },
  { name: 'Gestion des paiements', body: 'Facturation automatisée en dirhams (MAD), liens de paiement en ligne, suivi des revenus en temps réel.' },
  { name: 'Analyses pédagogiques', body: "Tableaux de bord par élève identifiant qui progresse et qui a besoin d'aide." },
  { name: 'Communication parents', body: 'Annonces, bulletins et messages directs envoyés aux parents en quelques secondes.' },
  { name: 'Gestion multi-sites', body: "Tableau de bord unifié pour plusieurs sites : comparaison des performances, transfert d'élèves entre sites." },
];

/** Same FAQ shown on the homepage — see HOME_FAQ in src/app/core/seo/schema.ts. */
const FAQ = [
  { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Données chiffrées au repos (AES-256) et en transit (TLS 1.3), sauvegardes nocturnes automatisées, conformité RGPD. Aucune vente ni partage des données avec des tiers.' },
  { q: 'Puis-je migrer depuis un autre système ?', a: "Oui, sans frais supplémentaires pour les formules payantes (dossiers d'élèves, historique des paiements, planning). Modèles d'import fournis pour la formule Débutant." },
  { q: 'Combien de temps prend la configuration ?', a: 'La plupart des centres sont opérationnels en un après-midi ; durée moyenne de première configuration inférieure à deux heures, import de données inclus.' },
  { q: 'Y a-t-il une application mobile ?', a: 'Oui, sur iOS et Android, pour enseignants (présences), parents (alertes) et administrateurs. La plateforme web est également responsive.' },
  { q: "Puis-je essayer avant de m'engager ?", a: "Oui. La formule Débutant est gratuite à vie sans carte bancaire ; la formule Pro inclut un essai gratuit de 30 jours et un remboursement intégral si non satisfait." },
  { q: "Que se passe-t-il si je dépasse ma limite d'élèves ?", a: "Notification par e-mail à 80% de la limite ; mise à niveau instantanée sans blocage ni perte de données." },
  { q: 'Moujtahid convient-il à tous les types de centres au Maroc ?', a: 'Oui : centres de soutien scolaire (usage principal), écoles privées, centres de langues et centres de formation. Facturation en dirhams, villes marocaines intégrées, alertes SMS locales.' },
];

/** Buyer's-guide selection criteria — see meilleur-logiciel.component.html. */
const BUYING_CRITERIA = [
  'Interface et support réellement en français, avec un support qui comprend le contexte marocain',
  'Facturation en dirhams (MAD), sans conversion ni devise étrangère',
  "Présences et alertes automatiques aux parents en cas d'absence",
  'Gestion des groupes, niveaux et emplois du temps',
  'Application mobile pour les parents (présences, notes, paiements)',
  'Prix transparent en dirhams et essai gratuit avant engagement',
];

const PAGES = [
  { label: 'Accueil : présentation, fonctionnalités, tarifs et FAQ', path: '/' },
  { label: 'Logiciel de gestion de centre de soutien scolaire', path: '/logiciel-gestion-centre-soutien-scolaire' },
  { label: 'Logiciel de gestion de centre de langues', path: '/logiciel-gestion-centre-de-langues' },
  { label: "Logiciel de gestion d'école", path: '/logiciel-gestion-ecole' },
  { label: 'Gestion des élèves (fonctionnalité)', path: '/fonctionnalites/gestion-eleves' },
  { label: 'Meilleur logiciel de gestion de centre au Maroc — guide de choix', path: '/meilleur-logiciel-gestion-centre-maroc' },
  { label: 'Comparatif Moujtahid vs Tayssir Académie', path: '/moujtahid-vs-tayssir-academie' },
  { label: 'Comparatif Moujtahid vs CenterPlus', path: '/moujtahid-vs-centerplus' },
];

/**
 * Honest, sourced comparison facts (also shown on the vs-* pages). Kept here
 * too so /llms-full.txt — which many AI engines will read as the single
 * summary of the whole site — states "how does Moujtahid compare to X"
 * facts directly, not just linking off to a page a crawler may not follow.
 */
const COMPARISONS = [
  {
    name: 'Tayssir Académie',
    url: 'https://academie.tayssir.school/',
    points: [
      'Tayssir Académie facture annuellement (500, 3 500 ou 5 000 DH/an) ; Moujtahid facture mensuellement (189-289 MAD/mois), sans engagement annuel.',
      "Tayssir Académie propose un module RH avec paie des enseignants, que Moujtahid ne propose pas comme module dédié.",
      "Moujtahid met l'accent sur la planification intelligente (détection automatique de conflits) et les alertes SMS de présence.",
      'Éditée par MJ Tech Solution, qui accompagne des établissements marocains depuis 2008.',
    ],
  },
  {
    name: 'CenterPlus',
    url: 'https://www.centerplus.app/',
    points: [
      "CenterPlus cible aussi le marché marocain (Casablanca, Agadir, Rabat, Marrakech) mais son interface est en arabe ; Moujtahid est en français.",
      'CenterPlus ne publie pas ses tarifs en ligne (sur devis) ; Moujtahid publie ses tarifs en dirhams avec un essai gratuit sans carte bancaire.',
      'CenterPlus envoie des reçus numériques par WhatsApp et gère le prorata pour les inscriptions en cours d\'année.',
      'CenterPlus annonce une configuration en moins de 10 minutes.',
    ],
  },
];

/**
 * /llms.txt — a concise, factual, markdown summary of the site aimed at AI
 * engines (llmstxt.org convention): a short index an AI engine can fetch
 * cheaply, linking to /llms-full.txt for the complete detail.
 */
function buildLlms(baseUrl) {
  return `# Moujtahid

> Moujtahid est un logiciel marocain de gestion des centres de soutien scolaire et de langues (et d'écoles privées) : gestion des élèves, présences, paiements en dirhams (MAD) et application mobile pour les parents.

Moujtahid est conçu au Maroc, en français, avec une facturation en dirhams (MAD). Il s'adresse en priorité aux centres de soutien scolaire, et aussi aux centres de langues et aux écoles privées, de Casablanca à Rabat, Marrakech et Fès. Trois formules sont proposées (Débutant, Pro, Entreprise), avec un essai gratuit de 30 jours sur la formule Pro et une formule Débutant gratuite à vie.

## Pages principales
${PAGES.map(p => `- [${p.label}](${baseUrl}${p.path})`).join('\n')}

## Fonctionnalités
${FEATURES.map(f => `- **${f.name}** : ${f.body}`).join('\n')}

## Tarifs (MAD = dirham marocain)
${PLANS.map(p => `- **${p.name}** — ${p.price} : ${p.features.join(', ')}.`).join('\n')}

## Faits
- Marché : Maroc
- Langue : français
- Monnaie : dirham marocain (MAD)
- Essai gratuit : 30 jours (formule Pro) ; formule Débutant gratuite à vie
- Plateformes : Web, iOS, Android
- Sécurité : chiffrement AES-256 au repos, TLS 1.3 en transit, conformité RGPD
- Contact : support@moujtahide.ma

Détails complets (FAQ, tarifs par fonctionnalité, critères de choix) : ${baseUrl}/llms-full.txt
`;
}

/**
 * /llms-full.txt — the deep-dive companion to /llms.txt: full FAQ answers,
 * per-plan feature lists and the buyer's-guide selection criteria, all
 * sourced from the same copy shown on-page (see the consts above), so an AI
 * engine fetching this one file has enough to answer most questions about
 * Moujtahid without needing to crawl the rest of the site.
 */
function buildLlmsFull(baseUrl) {
  return `# Moujtahid — informations complètes

> Logiciel marocain de gestion des centres de soutien scolaire, de langues et des écoles privées. Élèves, présences, paiements en dirhams (MAD), application mobile parents. Essai gratuit.

## Qu'est-ce que Moujtahid ?
Moujtahid est un logiciel de gestion pensé pour le Maroc : interface en français, facturation en dirhams (MAD), villes marocaines intégrées et alertes SMS locales. Il s'adresse en priorité aux centres de soutien scolaire, et aussi aux centres de langues, aux écoles privées et aux centres de formation, de Casablanca à Rabat, Marrakech et Fès.

## Fonctionnalités
${FEATURES.map(f => `### ${f.name}\n${f.body}`).join('\n\n')}

## Tarifs
${PLANS.map(p => `### ${p.name} — ${p.price}\n${p.features.map(f => `- ${f}`).join('\n')}`).join('\n\n')}

Toutes les formules incluent la propriété complète des données. La formule Pro inclut une garantie de remboursement de 30 jours. Aucune carte bancaire requise pour démarrer avec la formule Débutant.

## Comment choisir un logiciel de gestion de centre au Maroc
Critères à vérifier avant de choisir, quel que soit le type de centre :
${BUYING_CRITERIA.map(c => `- ${c}`).join('\n')}

## Questions fréquentes
${FAQ.map(f => `### ${f.q}\n${f.a}`).join('\n\n')}

## Comparaisons avec d'autres logiciels
Comparatifs sourcés sur les sites publics de chaque éditeur (voir la page dédiée pour le détail complet et les sources) :

${COMPARISONS.map(c => `### Moujtahid vs ${c.name}\n${c.points.map(p => `- ${p}`).join('\n')}`).join('\n\n')}

## Pages du site
${PAGES.map(p => `- [${p.label}](${baseUrl}${p.path})`).join('\n')}

## Faits de référence
- Éditeur : Moujtahide (auto-entrepreneur, Maroc)
- Marché : Maroc
- Langue de l'interface : français
- Monnaie : dirham marocain (MAD)
- Plateformes : Web (responsive), iOS, Android
- Sécurité : chiffrement AES-256 au repos, TLS 1.3 en transit, sauvegardes nocturnes automatisées, conformité RGPD
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
  writeFileSync(join(browserDir, 'llms-full.txt'), buildLlmsFull(baseUrl));

  console.log(`Sitemap:   ${routes.length} routes -> ${baseUrl}/sitemap.xml`);
  console.log(`Robots:    ${baseUrl}/robots.txt`);
  console.log(`LLMs:      ${baseUrl}/llms.txt`);
  console.log(`LLMs full: ${baseUrl}/llms-full.txt`);
}

main().catch(err => {
  console.error(`[generate-sitemap] ${err.message}`);
  process.exit(1);
});
