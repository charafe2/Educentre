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
    title: 'Moujtahid — Logiciel de gestion des centres scolaires au Maroc',
    description:
      'Moujtahid, le logiciel de gestion des centres scolaires au Maroc : élèves, présences, paiements en MAD et application parents. Essai gratuit 30 jours.',
    keywords:
      'gestion des centres scolaires Maroc, logiciel gestion scolaire Maroc, gestion des élèves, gestion des écoles Maroc',
  },
  tutoringCenter: {
    path: '/logiciel-gestion-centre-soutien-scolaire',
    title: 'Logiciel de gestion de centre de soutien scolaire au Maroc',
    description:
      'Logiciel de gestion de centre de soutien scolaire conçu pour le Maroc : groupes, présences, paiements en MAD et suivi des élèves, de Casablanca à Marrakech.',
    keywords:
      'logiciel gestion centre de soutien scolaire, gestion centre de soutien Maroc, gestion des élèves',
  },
  school: {
    path: '/logiciel-gestion-ecole',
    title: "Logiciel de gestion d'école privée au Maroc | Moujtahid",
    description:
      "Solution de gestion des écoles au Maroc (تدبير المدرسة) : inscriptions, emplois du temps, paiements en dirhams et communication parents, pour les écoles marocaines.",
    keywords: 'gestion des écoles Maroc, logiciel gestion école privée Maroc, gestion scolaire',
  },
  languageCenter: {
    path: '/logiciel-gestion-centre-de-langues',
    title: 'Logiciel de gestion de centre de langues au Maroc | Moujtahid',
    description:
      "Logiciel de gestion de centre de langues au Maroc : sessions, niveaux, présences et paiements en MAD, pour les centres de langues de Rabat, Casablanca et Fès.",
    keywords:
      'logiciel gestion centre de langues, gestion centre de langues Maroc, gestion des élèves',
  },
  studentManagement: {
    path: '/fonctionnalites/gestion-eleves',
    title: 'Gestion des élèves — Logiciel scolaire au Maroc | Moujtahid',
    description:
      'La gestion des élèves (تدبير التلاميذ) simplifiée : dossiers, présences, notes, paiements en MAD et alertes parents, pour les centres et écoles au Maroc.',
    keywords: 'gestion des élèves, gestion des élèves Maroc, logiciel gestion scolaire',
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
