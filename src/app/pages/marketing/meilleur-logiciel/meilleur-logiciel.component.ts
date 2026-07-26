import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-meilleur-logiciel',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent, RelatedPagesComponent],
  templateUrl: './meilleur-logiciel.component.html',
  styleUrl: '../marketing-shared.css',
})
export class MeilleurLogicielComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.bestSoftware;

  readonly faqItems: FaqItem[] = [
    {
      question: 'Quel est le meilleur logiciel de gestion de centre de soutien scolaire au Maroc ?',
      answer:
        "Le meilleur logiciel dépend de vos besoins, mais pour un centre de soutien scolaire au Maroc, privilégiez un outil en français, facturant en dirhams (MAD), avec présences, alertes aux parents et un prix transparent. Moujtahid réunit ces éléments, à partir de 189 MAD/mois avec un essai gratuit de 30 jours.",
    },
    {
      question: 'Existe-t-il un logiciel de gestion de centre de langues en français et en dirhams ?',
      answer:
        'Oui. Moujtahid gère les centres de langues en français avec une facturation en dirhams (MAD) : sessions, niveaux, présences et paiements dans une seule application.',
    },
    {
      question: 'Combien coûte un logiciel de gestion de centre au Maroc ?',
      answer:
        'Les prix varient selon les éditeurs. Moujtahid propose deux formules mensuelles en dirhams : Débutant à 189 MAD et Pro à 289 MAD, avec un essai gratuit de 30 jours.',
    },
    {
      question: 'Peut-on essayer un logiciel de gestion de centre gratuitement avant de choisir ?',
      answer:
        "Oui. Moujtahid propose un essai gratuit de 30 jours, sans carte bancaire, pour tester la gestion des élèves, des présences et des paiements avant de s'engager.",
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Meilleur logiciel de gestion de centre', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
