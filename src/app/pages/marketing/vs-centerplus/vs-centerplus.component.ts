import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MarketingLayoutComponent } from '../marketing-layout/marketing-layout.component';
import { FaqSectionComponent } from '../../../shared/faq-section/faq-section.component';
import { RelatedPagesComponent } from '../../../shared/related-pages/related-pages.component';
import { SeoService } from '../../../core/seo/seo.service';
import { PUBLIC_PAGES } from '../../../core/seo/public-pages';
import { buildBreadcrumbs, buildFaqSchema, FaqItem } from '../../../core/seo/schema';

@Component({
  selector: 'app-vs-centerplus',
  standalone: true,
  imports: [MarketingLayoutComponent, RouterLink, FaqSectionComponent, RelatedPagesComponent],
  templateUrl: './vs-centerplus.component.html',
  styleUrl: '../marketing-shared.css',
})
export class VsCenterPlusComponent implements OnInit {
  private readonly seo = inject(SeoService);
  protected readonly page = PUBLIC_PAGES.vsCenterPlus;

  readonly faqItems: FaqItem[] = [
    {
      question: 'Moujtahid ou CenterPlus, quelle est la différence de langue ?',
      answer:
        "Moujtahid est entièrement en français. CenterPlus propose une version en arabe de son site ; ses langues d'interface disponibles au-delà de l'arabe ne sont pas détaillées publiquement au moment de la rédaction. Si vous gérez votre centre en français, vérifiez la langue de l'interface CenterPlus directement auprès de l'éditeur avant de choisir.",
    },
    {
      question: 'CenterPlus et Moujtahid gèrent-ils tous les deux les paiements en dirhams ?',
      answer:
        "Moujtahid facture explicitement en dirhams (MAD), à partir de 189 MAD/mois. CenterPlus annonce une gestion des paiements avec alertes automatiques pour impayés et un calcul au prorata pour les inscriptions en cours d'année, mais ses tarifs ne sont pas publiés sur son site — contactez l'éditeur pour un devis.",
    },
    {
      question: 'Quelle est la formule la plus rapide à mettre en place, Moujtahid ou CenterPlus ?',
      answer:
        'CenterPlus annonce une configuration en moins de 10 minutes. Moujtahid annonce une durée moyenne de première configuration inférieure à deux heures, import des données existantes inclus, avec un assistant d\'intégration guidé.',
    },
  ];

  ngOnInit(): void {
    this.seo.setPageSeo(this.page);
    this.seo.setSchema([
      buildBreadcrumbs([
        { name: 'Accueil', path: '/' },
        { name: 'Moujtahid vs CenterPlus', path: this.page.path },
      ]),
      buildFaqSchema(this.faqItems),
    ]);
  }
}
