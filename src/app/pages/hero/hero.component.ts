import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewEncapsulation, PLATFORM_ID, Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { VideoHeroComponent } from './video-hero/video-hero.component';

type IntroState = 'active' | 'dismissed';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, VideoHeroComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.css',
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('videoIntroSlide', [
      state('active', style({ transform: 'translateY(0)' })),
      state('dismissed', style({ transform: 'translateY(-100vh)' })),
      transition('active => dismissed', [
        animate('900ms cubic-bezier(0.76, 0, 0.24, 1)'),
      ]),
    ]),
    trigger('landingSlide', [
      state('active', style({ transform: 'translateY(100vh)' })),
      state('dismissed', style({ transform: 'translateY(0)' })),
      transition('active => dismissed', [
        animate('900ms cubic-bezier(0.76, 0, 0.24, 1)'),
      ]),
    ]),
  ],
})
export class HeroComponent implements OnInit, OnDestroy, AfterViewInit {
  introState: IntroState = 'active';
  showVideoIntro = true;
  demoSubmitting = false;
  demoSubmitted = false;

  private _savedBg = '';
  private _rafHandle = 0;
  private _sectionRafHandle = 0;
  private _sectionMotionAbort?: AbortController;
  private _listenerAbort = new AbortController();
  private _observers: IntersectionObserver[] = [];
  private _introDismissed = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private title: Title,
    private meta: Meta,
  ) {}

  ngOnInit() {
    this.title.setTitle('Logiciel de gestion scolaire au Maroc | Moujtahid');
    this.meta.updateTag({
      name: 'description',
      content: 'Moujtahid, logiciel de gestion des centres de soutien scolaire au Maroc : '
        + 'planning intelligent, présences, paiements en dirhams, application parents. '
        + 'Essai gratuit 30 jours.',
    });

    if (!isPlatformBrowser(this.platformId)) return;
    this._savedBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#ffffff';
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  ngOnDestroy() {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.style.backgroundColor = this._savedBg;
    document.documentElement.style.scrollBehavior = '';
    cancelAnimationFrame(this._rafHandle);
    cancelAnimationFrame(this._sectionRafHandle);
    this._sectionMotionAbort?.abort();
    this._listenerAbort.abort();
    this._observers.forEach(o => o.disconnect());
    this._observers = [];
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this._initCharReveal();
    this._initNavBehavior();
    this._initScrollReveal();
    this._initSectionHandoff();
    this._initMagneticCards();
    this._initMockupParallax();
    this._initCounters();
    this._initRiskTechAnimations();
    this._initDemoSelects();
    this._initRippleButtons();
    this._initFaq();
  }

  proceedToLanding(): void {
    if (this._introDismissed) return;

    this._introDismissed = true;
    this.introState = 'dismissed';
  }

  onIntroAnimationDone(): void {
    if (this.introState !== 'dismissed') return;

    this.showVideoIntro = false;
  }

  // ─── 1. Char-by-char ink reveal ─────────────────────────────────
  private _initCharReveal() {
    const headline = document.getElementById('lp-headline');
    if (!headline) return;

    const line1 = 'Gérez votre centre';
    const line2Prefix = 'avec ';  // non-breaking space keeps "avec précision" together on breaks
    const line2Accent = 'précision.';

    let idx = 0;
    const charSpan = (ch: string, accent = false): string => {
      if (ch === ' ' || ch === ' ') { idx++; return ' '; }
      return `<span class="char${accent ? ' accent' : ''}" style="--ci:${idx++}">${ch}</span>`;
    };

    const buildLine = (text: string, accent = false) =>
      text.split('').map(c => charSpan(c, accent)).join('');

    const html =
      `<span class="hl-line">${buildLine(line1)}</span><br>` +
      `<span class="hl-line">${buildLine(line2Prefix)}${buildLine(line2Accent, true)}</span>`;

    headline.innerHTML = html;

    // Stagger supporting elements after chars start appearing
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => document.getElementById('lp-overline')?.classList.add('visible'), 60);
    setTimeout(() => {
      document.getElementById('lp-subhead')?.classList.add('visible');
      document.getElementById('lp-ctas')?.classList.add('visible');
      document.getElementById('lp-trust')?.classList.add('visible');
      document.getElementById('lp-mockup')?.classList.add('visible');
    }, reduced ? 80 : 520);
  }

  // ─── 2. Smart nav — shadow + compact + active section ───────────
  private _initNavBehavior() {
    const nav = document.getElementById('lp-nav');
    const hamburger = document.getElementById('lp-hamburger');
    const mobileMenu = document.getElementById('lp-mobile-menu');
    if (!nav || !hamburger || !mobileMenu) return;

    let open = false;
    let prevY = 0;

    // Active section detection
    const links = document.querySelectorAll<HTMLElement>('.lp .nav__link');
    const sectionObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => {
          l.classList.toggle('nav__link--active', l.getAttribute('href') === `#${e.target.id}`);
        });
      });
    }, { threshold: 0.35 });
    this._observers.push(sectionObs);

    document.querySelectorAll('.lp section[id]').forEach(s => sectionObs.observe(s));

    // Scroll → shadow + compact mode
    window.addEventListener('scroll', () => {
      const sy = window.scrollY;
      nav.classList.toggle('nav--scrolled', sy > 80);
      nav.classList.toggle('nav--compact', sy > 80 && sy > prevY);
      prevY = sy;
    }, { passive: true, signal: this._listenerAbort.signal });

    // Hamburger
    const closeMenu = () => {
      open = false;
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    };

    hamburger.addEventListener('click', () => {
      open = !open;
      hamburger.classList.toggle('open', open);
      mobileMenu.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });

    mobileMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', closeMenu));
  }

  // ─── 3. Cinematic scroll-triggered section reveals ───────────────
  private _initScrollReveal() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        setTimeout(() => el.classList.add('visible'), Number(el.dataset['delay'] ?? 0));
        observer.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -48px 0px' });
    this._observers.push(observer);

    // Section headers — each child staggers independently
    document.querySelectorAll('.lp .section__header .reveal').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 100);
      observer.observe(el);
    });

    // Standalone .reveal elements (statement, cta-banner, etc.)
    document.querySelectorAll('.lp .reveal').forEach(el => {
      if (!(el as HTMLElement).dataset['delay'] && !el.closest('.section__header'))
        observer.observe(el);
    });

    // Bento cards
    document.querySelectorAll('.lp .bento__card').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 80);
      observer.observe(el);
    });

    // Timeline steps
    document.querySelectorAll('.lp .step').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 100);
      observer.observe(el);
    });

    // Risk technology flow
    document.querySelectorAll('.lp .risk-flow > .reveal, .lp .risk-update').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 130);
      observer.observe(el);
    });

    document.querySelectorAll('.lp .excel-shift .reveal').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 120);
      observer.observe(el);
    });

    document.querySelectorAll('.lp .demo-request .reveal').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 140);
      observer.observe(el);
    });

    // Testimonial cascade wave
    document.querySelectorAll('.lp .t-card').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 120);
      observer.observe(el);
    });

    // Pricing cards
    document.querySelectorAll('.lp .p-card').forEach((el, i) => {
      (el as HTMLElement).dataset['delay'] = String(i * 80);
      observer.observe(el);
    });
  }

  // ─── 4. Magnetic hover on bento cards ───────────────────────────
  private _initSectionHandoff() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.lp main > section:not(.hero), .lp main > .social-proof'
      )
    );

    if (!sections.length) return;

    sections.forEach((section, index) => {
      section.classList.add('section-handoff');
      section.style.setProperty('--handoff-z', String(index + 1));
    });

    const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
    const easeOutQuint = (value: number) => 1 - Math.pow(1 - value, 5);

    const update = () => {
      const viewport = window.innerHeight || 1;

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const enter = clamp((viewport - rect.top) / (viewport * 0.74));
        const exit = clamp((rect.top + rect.height - viewport * 0.16) / (viewport * 0.84));
        const presence = clamp(Math.min(enter, exit));
        const easedPresence = easeOutQuint(presence);
        const liftingIn = 1 - easedPresence;
        const leaving = clamp((viewport * 0.12 - rect.bottom) / (viewport * 0.52));

        const y = liftingIn * 54 - leaving * 36;
        const scale = 0.955 + easedPresence * 0.045 - leaving * 0.018;
        const opacity = 0.48 + easedPresence * 0.52 - leaving * 0.18;
        const blur = liftingIn * 8 + leaving * 3;

        section.style.setProperty('--handoff-y', `${y.toFixed(2)}px`);
        section.style.setProperty('--handoff-scale', scale.toFixed(4));
        section.style.setProperty('--handoff-opacity', clamp(opacity, 0.28, 1).toFixed(3));
        section.style.setProperty('--handoff-blur', `${blur.toFixed(2)}px`);
      });

      this._sectionRafHandle = 0;
    };

    const requestUpdate = () => {
      if (this._sectionRafHandle) return;
      this._sectionRafHandle = requestAnimationFrame(update);
    };

    this._sectionMotionAbort = new AbortController();
    window.addEventListener('scroll', requestUpdate, {
      passive: true,
      signal: this._sectionMotionAbort.signal,
    });
    window.addEventListener('resize', requestUpdate, {
      passive: true,
      signal: this._sectionMotionAbort.signal,
    });

    requestUpdate();
  }

  private _initMagneticCards() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll<HTMLElement>('.lp .bento__card').forEach(card => {
      const icon = card.querySelector<HTMLElement>('.bento__icon');

      card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 120ms linear, border-color 200ms, box-shadow 200ms';
        card.style.willChange = 'transform';
      });

      card.addEventListener('mousemove', (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const dx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
        const dy = ((e.clientY - r.top)  / r.height - 0.5) * 2;
        card.style.transform =
          `perspective(900px) rotateX(${-dy * 6}deg) rotateY(${dx * 6}deg) translateZ(6px)`;
        card.style.borderColor = 'rgba(0,113,227,0.28)';
        if (icon) icon.style.transform = `translate(${dx * -3}px,${dy * -3}px)`;
      });

      card.addEventListener('mouseleave', () => {
        const spring = 'transform 600ms cubic-bezier(0.23,1,0.32,1), border-color 300ms, box-shadow 300ms';
        card.style.transition = spring;
        card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)';
        card.style.borderColor = '';
        if (icon) {
          icon.style.transition = 'transform 600ms cubic-bezier(0.23,1,0.32,1)';
          icon.style.transform = '';
        }
        setTimeout(() => {
          card.style.transition = '';
          card.style.willChange = '';
          if (icon) icon.style.transition = '';
        }, 620);
      });
    });
  }

  private _initMockupParallax() {
    const wrap  = document.getElementById('lp-mockup');
    const inner = wrap?.querySelector<HTMLElement>('.mockup__content');
    if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let tY = 0, cY = 0;
    let tR = 0, cR = 0;
    let tIY = 0, cIY = 0;
    const L = 0.08;  

    const tick = () => {
      // Batch reads before writes (no layout thrash)
      cY  += (tY  - cY)  * L;
      cR  += (tR  - cR)  * L;
      cIY += (tIY - cIY) * L;

      wrap.style.transform = `translateY(${cY}px) rotateY(${cR}deg)`;
      if (inner) inner.style.transform = `translateY(${cIY}px)`;

      this._rafHandle = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', () => {
      const sy = window.scrollY;
      tY  = sy * 0.15;
      tR  = -Math.min((sy / 400) * 3, 3);
      tIY = -(sy * 0.07);  // inner drifts opposite → depth illusion
    }, { passive: true, signal: this._listenerAbort.signal });

    // Start after initial fade-in animation completes
    setTimeout(() => {
      wrap.style.transition = 'none';
      this._rafHandle = requestAnimationFrame(tick);
    }, 950);
  }

  // ─── 6. Number counter — easeOutExpo via RAF ────────────────────
  private _initCounters() {
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const runCounter = (el: HTMLElement) => {
      const target   = parseFloat(el.dataset['count']!);
      const suffix   = el.dataset['suffix'] ?? '';

      if (reduced) {
        el.textContent = target.toLocaleString('fr-FR') + suffix;
        return;
      }

      const inHero   = !!el.closest('#lp-mockup');
      const delay    = inHero ? 900 : 0;
      const duration = 1800;

      setTimeout(() => {
        const t0 = performance.now();
        const tick = (now: number) => {
          const p   = Math.min((now - t0) / duration, 1);
          const val = Math.round(target * easeOutExpo(p));
          el.textContent = val.toLocaleString('fr-FR') + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, delay);
    };

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        runCounter(e.target as HTMLElement);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    this._observers.push(obs);

    document.querySelectorAll<HTMLElement>('.lp [data-count]').forEach(el => {
      el.textContent = '0' + (el.dataset['suffix'] ?? '');
      obs.observe(el);
    });
  }

  private _initRiskTechAnimations() {
    const section = document.querySelector<HTMLElement>('.lp .risk-tech');
    if (!section) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        section.classList.add('risk-tech--active');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.28, rootMargin: '0px 0px -80px 0px' });
    this._observers.push(obs);

    obs.observe(section);
  }

  private _initDemoSelects() {
    const selects = Array.from(document.querySelectorAll<HTMLElement>('.lp [data-demo-select]'));
    if (!selects.length) return;

    const closeAll = (except?: HTMLElement) => {
      selects.forEach(select => {
        if (select === except) return;
        select.classList.remove('is-open');
        select.querySelector<HTMLButtonElement>('.demo-select__trigger')?.setAttribute('aria-expanded', 'false');
      });
    };

    selects.forEach(select => {
      const trigger = select.querySelector<HTMLButtonElement>('.demo-select__trigger');
      const value = select.querySelector<HTMLElement>('.demo-select__value');
      const input = select.querySelector<HTMLInputElement>('input[type="hidden"]');
      const options = Array.from(select.querySelectorAll<HTMLButtonElement>('.demo-select__option'));
      if (!trigger || !value || !input || !options.length) return;

      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const nextOpen = !select.classList.contains('is-open');
        closeAll(select);
        select.classList.toggle('is-open', nextOpen);
        trigger.setAttribute('aria-expanded', String(nextOpen));
      });

      options.forEach(option => {
        option.setAttribute('aria-selected', 'false');
        option.addEventListener('click', event => {
          event.stopPropagation();
          const selected = option.dataset['value'] ?? option.textContent?.trim() ?? '';
          input.value = selected;
          value.textContent = selected;
          value.classList.remove('demo-select__value--placeholder');
          options.forEach(item => item.setAttribute('aria-selected', String(item === option)));
          closeAll();
        });
      });

      select.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeAll();
      });
    });

    document.addEventListener('click', event => {
      if (selects.some(select => select.contains(event.target as Node))) return;
      closeAll();
    }, { signal: this._listenerAbort.signal });
  }

  // ─── Demo form — validation handled natively via `required` ─────
  onDemoSubmit(event: Event): void {
    event.preventDefault();
    if (this.demoSubmitting || this.demoSubmitted) return;

    this.demoSubmitting = true;

    // TODO: brancher l'API d'envoi des demandes de démo.
    // Les champs sont accessibles via new FormData(event.target as HTMLFormElement).
    setTimeout(() => {
      this.demoSubmitting = false;
      this.demoSubmitted = true;
    }, 700);
  }

  // ─── 7. Liquid ripple on primary CTAs ───────────────────────────
  private _initRippleButtons() {
    const sel = '.lp .btn-primary, .lp .btn-primary--white, .lp .btn-pricing--filled';
    document.querySelectorAll<HTMLElement>(sel).forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const { clientX, clientY } = e as MouseEvent;
        const r = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.cssText = `left:${clientX - r.left}px;top:${clientY - r.top}px`;
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      });
    });
  }

  private _initFaq() {
    document.querySelectorAll('.lp .faq__trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.faq__item');
        if (!item) return;
        const isOpen = item.classList.contains('faq__item--open');
        document.querySelectorAll('.lp .faq__item').forEach(i => {
          i.classList.remove('faq__item--open');
          i.querySelector('.faq__trigger')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('faq__item--open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }
}
