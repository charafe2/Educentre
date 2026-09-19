import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-gestion-eleves',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent, RelatedPagesComponent],
  templateUrl: './gestion-eleves.component.html',
  styleUrl: '../marketing-shared.css',
})
export class GestionElevesComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.studentManagement;

  readonly faqItems: FaqItem[] = [
    {
      question: "Que contient la fiche d'un élève dans Moujtahid ?",
      answer:
        "Chaque élève dispose d'une fiche centralisée : coordonnées, classe et groupe, présences, notes et situation de paiement, accessible en quelques secondes.",
    },
    {
      question: "Comment fonctionnent les alertes d'absence aux parents ?",
      answer:
        "Dès qu'une absence est enregistrée en séance, une alerte est envoyée automatiquement aux parents via l'application parents, sans démarche manuelle.",
    },
    {
      question: 'Peut-on suivre les notes et les paiements par élève ?',
      answer:
        "Oui. Les évaluations et les paiements en dirhams (MAD) sont reliés directement au dossier de l'élève, avec l'historique complet.",
    },
    {
      question: 'Comment Moujtahid repère-t-il les élèves à risque de départ ?',
      answer:
        "Moujtahid croise l'assiduité et la situation de paiement pour signaler les élèves à contacter en priorité, afin de réduire les départs.",
    },
    {
      question: 'Pour qui la gestion des élèves de Moujtahid est-elle conçue ?',
      answer:
        'Pour les centres de soutien scolaire, les centres de langues et les écoles privées au Maroc qui veulent suivre leurs élèves sans tableur, en français et en dirhams.',
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Fonctionnalités', path: '/#lp-features' },
        { name: 'Gestion des élèves', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
