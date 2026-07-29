import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-vs-tayssir',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent, RelatedPagesComponent],
  templateUrl: './vs-tayssir.component.html',
  styleUrl: '../marketing-shared.css',
})
export class VsTayssirComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.vsTayssir;

  readonly faqItems: FaqItem[] = [
    {
      question: 'Quelle est la différence de facturation entre Moujtahid et Tayssir Académie ?',
      answer:
        "Moujtahid facture mensuellement (189 MAD/mois en formule Débutant, 289 MAD/mois en formule Pro), sans engagement annuel. Tayssir Académie facture annuellement, avec des formules publiquement annoncées à 500 DH, 3 500 DH et 5 000 DH par an selon le niveau. Le bon choix dépend de si vous préférez un paiement mensuel flexible ou un engagement annuel.",
    },
    {
      question: 'Tayssir Académie propose-t-elle un essai gratuit comme Moujtahid ?',
      answer:
        "Tayssir Académie propose une démo gratuite sur demande et une garantie de remboursement de 30 jours sur sa formule Pro. Moujtahid propose un essai gratuit de 30 jours sur sa formule Pro et une formule Débutant gratuite à vie, sans carte bancaire.",
    },
    {
      question: 'Moujtahid ou Tayssir Académie : lequel choisir pour un centre de soutien scolaire ?',
      answer:
        "Les deux sont conçus pour le Maroc, en français, avec facturation en dirhams. Tayssir Académie (éditée par MJ Tech Solution depuis 2008) ajoute un module RH avec gestion de la paie des enseignants. Moujtahid met l'accent sur la planification intelligente avec détection automatique de conflits et les alertes SMS de présence. Le meilleur choix dépend de si la gestion de la paie ou la planification automatisée compte le plus pour votre centre.",
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Moujtahid vs Tayssir Académie', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
