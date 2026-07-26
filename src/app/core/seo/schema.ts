import { environment } from '../../../environments/environment';
import { JsonLdSchema } from './seo.model';

/** A single FAQ entry — the one source of truth for both the visible accordion
 *  and the FAQPage schema, so the two can never drift apart. */
export interface FaqItem {
  question: string;
  answer: string;
}

/** A breadcrumb trail node: label + site-relative path. */
export interface Crumb {
  name: string;
  path: string;
}

function siteBase(): string {
  return environment.siteUrl.replace(/\/+$/, '');
}

/**
 * BreadcrumbList node for a page's trail (e.g. Accueil → Cette page). Returns a
 * schema node (no @context) meant to be composed into a @graph via
 * SeoService.setSchema([...]).
 */
export function buildBreadcrumbs(crumbs: Crumb[]): JsonLdSchema {
  const base = siteBase();
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.path === '/' ? `${base}/` : `${base}/${crumb.path.replace(/^\/+/, '')}`,
    })),
  };
}

/**
 * FAQPage node built from the SAME items rendered in the visible accordion, so
 * the structured data matches on-page content exactly (a Google requirement).
 */
export function buildFaqSchema(items: ReadonlyArray<FaqItem>): JsonLdSchema {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

/**
 * Homepage structured data (single source of truth). Consolidates the
 * Organization, WebSite, SoftwareApplication and FAQ schema that previously
 * lived as a static block in index.html, so there is exactly one JSON-LD graph
 * and it can't drift out of sync. Injected on the homepage via SeoService.
 *
 * Prices MUST match the visible pricing cards on the homepage — update
 * {@link PRICING} here and hero.component.html together.
 * All URLs derive from environment.siteUrl (correct in every environment).
 */
export const PRICING = {
  debutant: { name: 'Débutant', price: 189 },
  pro: { name: 'Pro', price: 289 },
} as const;

/** FAQ shown on the homepage (kept in sync with the visible FAQ section). */
const HOME_FAQ: ReadonlyArray<{ question: string; answer: string }> = [
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer:
      'Oui. Toutes les données sont chiffrées au repos avec AES-256 et en transit via TLS 1.3. Des sauvegardes nocturnes automatisées sont stockées dans des emplacements géographiquement séparés. Moujtahid est entièrement conforme au RGPD et nous ne vendons ni ne partageons jamais vos données avec des tiers.',
  },
  {
    question: 'Puis-je migrer depuis un autre système ?',
    answer:
      "Absolument. Notre équipe prend en charge la migration complète - dossiers d'élèves, historique des paiements et données de planning - sans frais supplémentaires pour toutes les formules payantes. Pour les comptes Débutant, nous fournissons des modèles d'import détaillés et une documentation complète.",
  },
  {
    question: 'Combien de temps prend la configuration ?',
    answer:
      "La plupart des centres sont pleinement opérationnels en un seul après-midi. L'assistant d'intégration vous guide étape par étape pour ajouter vos matières, salles, enseignants et élèves. La durée moyenne de la première configuration est inférieure à deux heures - import de données existantes inclus.",
  },
  {
    question: 'Y a-t-il une application mobile ?',
    answer:
      'Oui. Moujtahid est disponible sur iOS et Android. Les enseignants prennent les présences depuis leur téléphone, les parents reçoivent des alertes en temps réel et les administrateurs peuvent suivre le centre depuis n\'importe où. La plateforme web est entièrement responsive sur tous les navigateurs.',
  },
  {
    question: "Puis-je essayer avant de m'engager sur une formule payante ?",
    answer:
      "Oui. La formule Débutant est gratuite à vie, sans carte bancaire requise. La formule Pro comprend un essai gratuit de 30 jours - toutes les fonctionnalités, sans restriction. Si vous n'êtes pas entièrement satisfait, nous remboursons intégralement dans les 30 jours, sans question posée.",
  },
  {
    question: "Que se passe-t-il si je dépasse ma limite d'élèves ?",
    answer:
      'Nous vous informons par e-mail lorsque vous atteignez 80 % de votre limite, afin que vous ayez le temps de planifier. La mise à niveau est instantanée - vos données ne sont jamais bloquées ni affectées. Nous ne couperons jamais l\'accès sans avertissement préalable.',
  },
  {
    question: 'Moujtahid convient-il à tous les types de centres au Maroc ?',
    answer:
      'Oui. Moujtahid est un logiciel de gestion scolaire conçu au Maroc, pensé d\'abord pour les centres de soutien scolaire, et adopté aussi par des écoles privées, centres de langues et centres de formation. Facturation en dirhams, villes marocaines intégrées et alertes SMS locales : tout est adapté au marché marocain.',
  },
];

/**
 * Customer testimonials — MUST mirror the visible cards in the homepage
 * "Témoignages" section (hero.component.html) exactly: same authors, quotes and
 * 5-star ratings. Structured data may only reflect genuine, on-page reviews; if
 * a card changes or is removed, update this list (and vice-versa).
 */
const HOME_TESTIMONIALS: ReadonlyArray<{ name: string; rating: number; quote: string }> = [
  {
    name: 'Fatima Zahra M.',
    rating: 5,
    quote:
      'Moujtahid nous a économisé douze heures par semaine rien que sur la planification. Les alertes de présence changent tout — les parents nous remercient de les tenir informés.',
  },
  {
    name: 'Youssef B.',
    rating: 5,
    quote:
      "Nous sommes passés des registres papier à un tableau de bord en temps réel en un seul après-midi. L'intégration était fluide et l'équipe disponible à chaque étape.",
  },
  {
    name: 'Nadia O.',
    rating: 5,
    quote:
      "La réconciliation des paiements occupait notre comptable une journée entière. Avec Moujtahid, c'est automatisé, précis au dirham, et vérifiable en moins de cinq minutes.",
  },
  {
    name: 'Omar K.',
    rating: 5,
    quote:
      "Les analyses nous ont donné des informations que nous n'avions jamais eues. Nous identifions maintenant les élèves fragiles des semaines avant les examens — et nous pouvons vraiment agir.",
  },
];

export function buildHomeSchema(): JsonLdSchema {
  const site = environment.siteUrl.replace(/\/+$/, '');

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}/#organization`,
        name: 'Moujtahid',
        url: `${site}/`,
        logo: `${site}/assets/photos/MoujtahideLogo.png`,
        email: 'support@moujtahide.ma',
        description:
          'Éditeur marocain de logiciel de gestion des centres de soutien scolaire et de langues, également adopté par les écoles privées.',
        areaServed: { '@type': 'Country', name: 'Maroc' },
        address: { '@type': 'PostalAddress', addressCountry: 'MA' },
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'support@moujtahide.ma',
          contactType: 'customer support',
          areaServed: 'MA',
          availableLanguage: ['French', 'Arabic'],
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        url: `${site}/`,
        name: 'Moujtahid',
        inLanguage: 'fr',
        publisher: { '@id': `${site}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${site}/#software`,
        name: 'Moujtahid',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        inLanguage: 'fr',
        url: `${site}/`,
        publisher: { '@id': `${site}/#organization` },
        countriesSupported: 'MA',
        areaServed: { '@type': 'Country', name: 'Maroc' },
        description:
          'Logiciel de gestion des centres de soutien scolaire et de langues au Maroc : élèves, présences, paiements en dirhams (MAD) et application parents.',
        offers: [
          {
            '@type': 'Offer',
            name: PRICING.debutant.name,
            price: PRICING.debutant.price,
            priceCurrency: 'MAD',
            category: 'monthly',
          },
          {
            '@type': 'Offer',
            name: PRICING.pro.name,
            price: PRICING.pro.price,
            priceCurrency: 'MAD',
            category: 'monthly',
          },
        ],
        // Reflects the genuine testimonials displayed on the homepage.
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: 5,
          reviewCount: HOME_TESTIMONIALS.length,
          bestRating: 5,
          worstRating: 1,
        },
        review: HOME_TESTIMONIALS.map(({ name, rating, quote }) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name },
          reviewRating: { '@type': 'Rating', ratingValue: rating, bestRating: 5, worstRating: 1 },
          reviewBody: quote,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${site}/#faq`,
        mainEntity: HOME_FAQ.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  };
}
