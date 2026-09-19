import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-gestion-ecole',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent, RelatedPagesComponent],
  templateUrl: './gestion-ecole.component.html',
  styleUrl: '../marketing-shared.css',
})
export class GestionEcoleComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.school;

  readonly faqItems: FaqItem[] = [
    {
      question: 'Moujtahid remplace-t-il Excel pour gérer une école ?',
      answer:
        'Oui. Moujtahid remplace les fichiers Excel dispersés par un système unique : inscriptions, emplois du temps, présences, paiements et communication parents, centralisés et toujours à jour.',
    },
    {
      question: 'Comment gérer les inscriptions et les emplois du temps ?',
      answer:
        "Vous créez le dossier de chaque élève et construisez les emplois du temps par classe et par enseignant, sans conflit de salle ni d'horaire.",
    },
    {
      question: 'Les frais de scolarité sont-ils suivis en dirhams ?',
      answer:
        'Oui. Les frais, les échéances et les reçus sont gérés en dirhams (MAD), avec une vue claire des impayés.',
    },
    {
      question: 'Existe-t-il une application pour les parents ?',
      answer:
        "Oui. Les parents suivent les présences, les notes et les paiements de leur enfant depuis une application mobile en français.",
    },
    {
      question: 'Combien coûte Moujtahid pour une école au Maroc ?',
      answer:
        'Deux formules mensuelles en dirhams : Débutant à 189 MAD et Pro à 289 MAD, avec un essai gratuit de 30 jours.',
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Gestion des écoles', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
