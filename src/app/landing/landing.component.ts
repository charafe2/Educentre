import { Component, signal, HostListener, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  navScrolled = signal(false);

  readonly dashNav = [
    { icon: 'fa-gauge',      active: true  },
    { icon: 'fa-users',      active: false },
    { icon: 'fa-chalkboard', active: false },
    { icon: 'fa-wallet',     active: false },
    { icon: 'fa-calendar',   active: false },
  ];

  readonly kpis = [
    { icon: 'fa-users',      value: '124', label: 'Étudiants',  change: '+12%', color: '#6366F1' },
    { icon: 'fa-wallet',     value: '12K', label: 'Revenus DH', change: '+8%',  color: '#0D9488' },
    { icon: 'fa-chart-line', value: '87%', label: 'Présence',   change: '+3%',  color: '#EC4899' },
  ];

  readonly chartBars = [38, 55, 42, 78, 65, 88, 72];

  readonly marqueeItems = [
    { icon: 'fa-star',         text: '500+ Centres actifs'   },
    { icon: 'fa-users',        text: '12 000+ Étudiants'     },
    { icon: 'fa-circle-check', text: '98% Satisfaction'      },
    { icon: 'fa-bolt',         text: 'Setup en 5 minutes'    },
    { icon: 'fa-shield',       text: 'Données sécurisées'    },
    { icon: 'fa-headset',      text: 'Support 24/7'          },
  ];

  readonly stats = [
    { value: 500, suffix: '+',  label: 'Centres actifs',      current: signal(0) },
    { value: 12,  suffix: 'K+', label: 'Étudiants gérés',     current: signal(0) },
    { value: 98,  suffix: '%',  label: 'Satisfaction clients', current: signal(0) },
    { value: 50,  suffix: 'K+', label: 'Paiements traités',    current: signal(0) },
  ];

  readonly features = [
    { icon: 'fa-users',        title: 'Gestion des étudiants',  desc: 'Inscriptions, dossiers, suivi de présence et de performance centralisés.',          color: '#6366F1' },
    { icon: 'fa-chalkboard',   title: 'Professeurs & Planning', desc: 'Affectations, emplois du temps et suivi des heures de chaque enseignant.',          color: '#0D9488' },
    { icon: 'fa-wallet',       title: 'Finances & Paiements',   desc: 'Facturation automatique, suivi des dettes et rapports financiers en temps réel.',   color: '#EC4899' },
    { icon: 'fa-calendar-days',title: 'Calendrier intelligent', desc: 'Organisez les séances visuellement et détectez automatiquement les conflits.',      color: '#F59E0B' },
    { icon: 'fa-chart-line',   title: 'Analytiques avancées',   desc: 'KPIs, tendances et rapports exportables pour piloter votre centre facilement.',     color: '#10B981' },
    { icon: 'fa-user-group',   title: 'Espace Parents',         desc: 'Portail dédié pour suivre les notes, présences et paiements en temps réel.',        color: '#F43F5E' },
  ];

  readonly steps = [
    { num: '01', icon: 'fa-building',  title: 'Créez votre centre',  desc: 'Configurez votre établissement en quelques minutes — niveaux, matières, salles de classe.' },
    { num: '02', icon: 'fa-user-plus', title: 'Ajoutez vos équipes', desc: 'Importez étudiants et professeurs, puis formez vos groupes pédagogiques.' },
    { num: '03', icon: 'fa-gauge',     title: 'Gérez en temps réel', desc: 'Suivez présences, finances et performances depuis un tableau de bord unifié et intuitif.' },
  ];

  private statsAnimated = false;
  private observers: IntersectionObserver[] = [];

  constructor() {
    afterNextRender(() => {
      this.initHeroAnimations();
      this.initScrollAnimations();
      this.initStatsObserver();
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    this.navScrolled.set(window.scrollY > 50);
  }

  onCardTilt(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotX = ((y - cy) / cy) * -8;
    const rotY = ((x - cx) / cx) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
    const glow = card.querySelector('.feat-card-glow') as HTMLElement;
    if (glow) { glow.style.opacity = '1'; glow.style.left = `${x}px`; glow.style.top = `${y}px`; }
  }

  onCardReset(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    card.style.transform = '';
    const glow = card.querySelector('.feat-card-glow') as HTMLElement;
    if (glow) glow.style.opacity = '0';
  }

  private initHeroAnimations() {
    document.querySelectorAll<HTMLElement>('.line-in').forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), 80 + i * 130);
    });
    ['.reveal-badge', '.reveal-sub', '.reveal-btns', '.reveal-trust', '.reveal-visual'].forEach((sel, i) => {
      setTimeout(() => document.querySelector(sel)?.classList.add('revealed'), 60 + i * 110);
    });
  }

  private initScrollAnimations() {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in-view'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.anim').forEach(el => obs.observe(el));
    this.observers.push(obs);
  }

  private initStatsObserver() {
    const el = document.querySelector('.stats-section');
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !this.statsAnimated) {
        this.statsAnimated = true;
        this.runCounters();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    this.observers.push(obs);
  }

  private runCounters() {
    this.stats.forEach(stat => {
      const total = stat.value;
      const steps = Math.round(1800 / (1000 / 60));
      let step = 0;
      const id = setInterval(() => {
        step++;
        const eased = 1 - Math.pow(1 - step / steps, 3);
        stat.current.set(Math.round(total * eased));
        if (step >= steps) { stat.current.set(total); clearInterval(id); }
      }, 1000 / 60);
    });
  }

  ngOnDestroy() {
    this.observers.forEach(o => o.disconnect());
  }
}
