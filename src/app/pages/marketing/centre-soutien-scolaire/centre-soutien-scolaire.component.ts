import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-centre-soutien-scolaire',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent],
  templateUrl: './centre-soutien-scolaire.component.html',
  styleUrl: '../marketing-shared.css',
})
export class CentreSoutienScolaireComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly page = PUBLIC_PAGES.tutoringCenter;

  // Single source of truth for both the visible accordion and the FAQPage schema.
  readonly faqItems: FaqItem[] = [
    {
      question: "Qu'est-ce qu'un logiciel de gestion de centre de soutien scolaire ?",
      answer:
        "C'est un outil qui centralise la gestion d'un centre de soutien scolaire : dossiers des élèves, groupes et emplois du temps, présences, paiements et communication avec les parents. Moujtahid réunit tout cela dans une seule application, en français et en dirhams (MAD).",
    },
    {
      question: 'Comment Moujtahid gère-t-il les paiements en dirhams ?',
      answer:
        'Vous suivez les mensualités de chaque élève, générez des reçus et repérez les impayés en dirhams (MAD). Les montants sont réconciliés au dirham près, sans tableur externe.',
    },
    {
      question: "Les parents sont-ils prévenus en cas d'absence ?",
      answer:
        "Oui. L'enseignant prend les présences depuis son téléphone et les parents reçoivent une alerte automatique lorsqu'un élève est absent, via l'application parents.",
    },
    {
      question: 'Moujtahid convient-il aux petits centres de soutien ?',
      answer:
        "Oui. La formule Débutant convient aux petits centres et la formule Pro aux centres en croissance. Vous pouvez commencer petit et évoluer sans changer d'outil.",
    },
    {
      question: 'Combien coûte Moujtahid au Maroc ?',
      answer:
        'Deux formules mensuelles en dirhams : Débutant à 189 MAD et Pro à 289 MAD, avec un essai gratuit de 30 jours, sans carte bancaire.',
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Gestion des centres de soutien scolaire', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
