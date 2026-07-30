import { PageSeo } from './seo.model';

/**
 * Canonical SEO metadata for every public (indexable) marketing route, in one
 * place so titles/descriptions can be reviewed and tuned without hunting through
 * components. Each route component imports its entry and passes it to
 * SeoService.setPageSeo() in ngOnInit.
 *
 * Copy is written in Moroccan French with explicit "Maroc" + MAD trust signals.
 * `path` values are the single source of truth for these routes' canonical URLs.
 */
export const PUBLIC_PAGES = {
  home: {
    path: '/',
    title: 'Gestion des Centres de Soutien Scolaire et Langues | Maroc',
    // Kept under 155 chars so Google's SERP doesn't truncate it — see index.html's
    // static <meta name="description">, which must say exactly the same thing.
    description:
      'Moujtahid : logiciel de gestion des centres de soutien scolaire, de langues et des écoles au Maroc. Paiements en MAD, appli parents. Essai gratuit.',
    keywords:
      'gestion des centres de soutien scolaire, gestion des centres de langues, gestion des écoles Maroc, logiciel gestion de centre Maroc, gestion des élèves',
  },
  tutoringCenter: {
    path: '/logiciel-gestion-centre-soutien-scolaire',
    title: 'Logiciel de gestion des centres de soutien scolaire au Maroc',
    description:
      'Logiciel de gestion des centres de soutien scolaire au Maroc : groupes, présences, paiements en MAD et suivi des élèves, de Casablanca à Marrakech.',
    keywords:
      'gestion des centres de soutien scolaire, logiciel gestion centre de soutien scolaire Maroc, gestion des élèves',
  },
  school: {
    path: '/logiciel-gestion-ecole',
    title: "Logiciel de gestion d'école privée au Maroc | Moujtahid",
    description:
      "Solution de gestion des écoles au Maroc (تدبير المدرسة) : inscriptions, emplois du temps, paiements en dirhams et communication parents.",
    keywords: 'gestion des écoles Maroc, logiciel gestion école privée Maroc, gestion scolaire',
  },
  languageCenter: {
    path: '/logiciel-gestion-centre-de-langues',
    title: 'Logiciel de gestion des centres de langues au Maroc | Moujtahid',
    description:
      "Logiciel de gestion des centres de langues au Maroc : sessions, niveaux, présences et paiements en MAD. Pour les centres de Rabat, Casablanca et Fès.",
    keywords:
      'gestion des centres de langues, logiciel gestion centre de langues Maroc, gestion des élèves',
  },
  bestSoftware: {
    path: '/meilleur-logiciel-gestion-centre-maroc',
    title: 'Meilleur logiciel de gestion de centre au Maroc | Moujtahid',
    description:
      'Comment choisir le meilleur logiciel de gestion de centre (soutien scolaire, langues) au Maroc : critères, prix en dirhams. Essai gratuit.',
    keywords:
      'meilleur logiciel de gestion de centre, logiciel gestion centre Maroc, gestion des centres de soutien, gestion des centres de langues',
  },
  studentManagement: {
    path: '/fonctionnalites/gestion-eleves',
    title: 'Gestion des élèves — Logiciel scolaire au Maroc | Moujtahid',
    description:
      'La gestion des élèves (تدبير التلاميذ) simplifiée : dossiers, présences, notes, paiements en MAD et alertes parents, pour les centres et écoles au Maroc.',
    keywords: 'gestion des élèves, gestion des élèves Maroc, logiciel gestion scolaire',
  },
  vsTayssir: {
    path: '/moujtahid-vs-tayssir-academie',
    title: 'Moujtahid vs Tayssir Académie : comparatif 2026 | Moujtahid',
    description:
      'Moujtahid ou Tayssir Académie pour gérer votre centre au Maroc ? Comparatif honnête : tarifs, facturation mensuelle vs annuelle, essai gratuit.',
    keywords: 'Moujtahid vs Tayssir Académie, comparatif logiciel gestion centre Maroc, alternative Tayssir Académie',
  },
  vsCenterPlus: {
    path: '/moujtahid-vs-centerplus',
    title: 'Moujtahid vs CenterPlus : comparatif 2026 | Moujtahid',
    description:
      'Moujtahid ou CenterPlus pour gérer votre centre au Maroc ? Comparatif honnête : langue, tarifs, fonctionnalités et facturation en dirhams (MAD).',
    keywords: 'Moujtahid vs CenterPlus, comparatif logiciel gestion centre Maroc, alternative CenterPlus',
  },
  blog: {
    path: '/blog',
    title: 'Blog Moujtahid — Ressources gestion de centres au Maroc',
    description:
      'Guides et comparatifs pour bien gérer un centre de soutien scolaire, de langues ou une école au Maroc.',
    keywords: 'blog gestion de centre Maroc, ressources gestion scolaire, guide logiciel centre',
  },
} as const satisfies Record<string, PageSeo>;

/** SEO metadata for the legal pages (indexable but low priority). */
export const LEGAL_PAGES = {
  privacy: {
    path: '/politique-de-confidentialite',
    title: 'Politique de confidentialité | Moujtahid',
    description:
      'Politique de confidentialité de Moujtahid, logiciel de gestion scolaire au Maroc : données personnelles, sécurité et conformité.',
  },
  terms: {
    path: '/conditions-generales-utilisation',
    title: "Conditions générales d'utilisation | Moujtahid",
    description:
      "Conditions générales d'utilisation du logiciel de gestion scolaire Moujtahid au Maroc.",
  },
  cookies: {
    path: '/politique-de-cookies',
    title: 'Politique de cookies | Moujtahid',
    description: 'Politique de cookies de Moujtahid, logiciel de gestion scolaire au Maroc.',
  },
  legalNotice: {
    path: '/mentions-legales',
    title: 'Mentions légales | Moujtahid',
    description: 'Mentions légales de Moujtahid, éditeur de logiciel de gestion scolaire au Maroc.',
  },
} as const satisfies Record<string, PageSeo>;
