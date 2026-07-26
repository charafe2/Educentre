import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-centre-de-langues',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent, RelatedPagesComponent],
  templateUrl: './centre-de-langues.component.html',
  styleUrl: '../marketing-shared.css',
})
export class CentreDeLanguesComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.languageCenter;

  readonly faqItems: FaqItem[] = [
    {
      question: "Comment gérer les sessions et les niveaux d'un centre de langues ?",
      answer:
        "Moujtahid organise vos cycles par niveau (par exemple A1 à C2) et par session, et affecte chaque apprenant au bon groupe. Vous gardez une vue claire du remplissage de chaque session.",
    },
    {
      question: 'Peut-on encaisser les paiements par session ou par mois ?',
      answer:
        'Oui. Les frais peuvent être suivis par session ou par mois, en dirhams (MAD), avec reçus et suivi des impayés.',
    },
    {
      question: 'Pour quelles langues Moujtahid convient-il ?',
      answer:
        "Pour tout centre de langues au Maroc : cours d'anglais, de français, d'arabe ou d'autres langues. La gestion des groupes, des présences et des paiements est identique quelle que soit la langue enseignée.",
    },
    {
      question: "Les apprenants et les parents sont-ils notifiés des absences ?",
      answer:
        "Oui. Les présences sont enregistrées à chaque séance et une alerte est envoyée automatiquement en cas d'absence.",
    },
    {
      question: 'Quel est le prix pour un centre de langues ?',
      answer:
        'Deux formules mensuelles en dirhams : Débutant à 189 MAD et Pro à 289 MAD, avec un essai gratuit de 30 jours.',
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Gestion des centres de langues', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
