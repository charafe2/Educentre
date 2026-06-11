import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewEncapsulation, PLATFORM_ID, Inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

  private _savedBg = '';
  private _rafHandle = 0;
  private _introDismissed = false;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  ngOnInit() {
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
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this._initCharReveal();
    this._initNavBehavior();
    this._initScrollReveal();
    this._initMagneticCards();
    this._initMockupParallax();
    this._initCounters();
    this._initRiskTechAnimations();
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

    document.querySelectorAll('.lp section[id]').forEach(s => sectionObs.observe(s));

    // Scroll → shadow + compact mode
    window.addEventListener('scroll', () => {
      const sy = window.scrollY;
      nav.classList.toggle('nav--scrolled', sy > 80);
      nav.classList.toggle('nav--compact', sy > 80 && sy > prevY);
      prevY = sy;
    }, { passive: true });

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

  // ─── 5. Layered mockup parallax with lerp ───────────────────────
  private _initMockupParallax() {
    const wrap  = document.getElementById('lp-mockup');
    const inner = wrap?.querySelector<HTMLElement>('.mockup__content');
    if (!wrap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let tY = 0, cY = 0;
    let tR = 0, cR = 0;
    let tIY = 0, cIY = 0;
    const L = 0.08;  // lerp factor

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
    }, { passive: true });

    // Start after initial fade-in animation completes
    setTimeout(() => {
      wrap.style.transition = 'none';
      this._rafHandle = requestAnimationFrame(tick);
    }, 950);
  }

  // ─── 6. Number counter — easeOutExpo via RAF ────────────────────
  private _initCounters() {
    const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const runCounter = (el: HTMLElement) => {
      const target   = parseFloat(el.dataset['count']!);
      const suffix   = el.dataset['suffix'] ?? '';
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

    obs.observe(section);
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

  // ─── 8. FAQ spring accordion ────────────────────────────────────
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
