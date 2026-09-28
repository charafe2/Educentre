import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CentreService } from '../../services/centre.service';
import { AuthStore } from '../../auth/auth.store';

/**
 * Top bar of the rebranded app. There is no sidebar: the brand always leads
 * home, the module links move between sections, and `section` names where
 * the user is. Every page with a section also gets a "Retour" button to the
 * home page — always the same destination, even after a reload or from a
 * shared link. The account menu carries the centre and the way out.
 */

interface NavLink {
  label: string;
  route: string;
  icon: 'groupes' | 'caisse' | 'enseignants' | 'parametres';
}

@Component({
  selector: 'app-bar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="bar" [class.is-scrolled]="scrolled()">
      <div class="inner">
        <nav class="trail" aria-label="Fil d’Ariane">
          @if (section()) {
            <a class="back" routerLink="/accueil" aria-label="Retour à l’accueil" aria-keyshortcuts="Alt+ArrowLeft">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
              <span class="back-text">Retour</span>
            </a>
            <span class="back-sep" aria-hidden="true"></span>
          }
          <a class="brand" routerLink="/accueil" aria-label="Moujtahid, accueil">
            <img class="brand-mark" src="/logo.png" alt="" aria-hidden="true">
            <span class="brand-text">
              <span class="brand-name">Moujtahid</span>
              <span class="brand-centre">{{ centre().name }}</span>
            </span>
          </a>
          @if (section()) {
            <svg class="trail-sep" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
            <span class="trail-current" aria-current="page">{{ section() }}</span>
          }
        </nav>

        @if (section()) {
          <nav class="modules" aria-label="Modules">
            @for (l of links; track l.route) {
              <a class="module" [routerLink]="l.route" routerLinkActive="is-on" [routerLinkActiveOptions]="{ exact: false }" #rla="routerLinkActive" [attr.aria-current]="rla.isActive ? 'page' : null">
                @switch (l.icon) {
                  @case ('groupes') { <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19v-.5a5.5 5.5 0 0 1 11 0v.5"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6.2M17.5 14a5.5 5.5 0 0 1 3 4.9V19"/></svg> }
                  @case ('caisse') { <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="18" height="11"/><circle cx="12" cy="12" r="2.4"/></svg> }
                  @case ('enseignants') { <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="11"/><path d="M7 8h8M7 11.5h5M9.5 20l2-5M14.5 20l-2-5"/></svg> }
                  @case ('parametres') { <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5h17M3.5 16.5h17"/><rect x="13" y="5" width="4.5" height="5"/><rect x="6.5" y="14" width="4.5" height="5"/></svg> }
                }
                <span>{{ l.label }}</span>
              </a>
            }
          </nav>
        }

        <div class="side">
          <div class="me-wrap">
            <button class="me" type="button" [class.is-open]="menuOpen()" aria-haspopup="menu" [attr.aria-expanded]="menuOpen()" [attr.aria-label]="'Compte de ' + userName()" (click)="menuOpen.set(!menuOpen())">
              <span class="me-initials" aria-hidden="true">{{ initials() }}</span>
              <svg class="me-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>
            </button>

            @if (menuOpen()) {
              <div class="menu" role="menu" aria-label="Compte" animate.enter="menu-enter" animate.leave="menu-leave">
                <div class="menu-head">
                  <span class="menu-avatar" aria-hidden="true">{{ initials() }}</span>
                  <span class="menu-who">
                    <strong>{{ userName() }}</strong>
                    <span>{{ isOwner() ? 'Propriétaire' : 'Membre de l’équipe' }}</span>
                  </span>
                </div>
                <a class="menu-centre" role="menuitem" routerLink="/parametres" [queryParams]="{ onglet: 'centre' }" (click)="menuOpen.set(false)">
                  <span class="menu-centre-name">{{ centre().name }}</span>
                  <span class="menu-plan">{{ plan() }}</span>
                </a>
                <div class="menu-list">
                  <a role="menuitem" routerLink="/parametres" [queryParams]="{ onglet: 'centre' }" (click)="menuOpen.set(false)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11"/><path d="M9.5 20v-6h5v6"/></svg>
                    Informations du centre
                  </a>
                  <a role="menuitem" routerLink="/parametres" [queryParams]="{ onglet: 'facture' }" (click)="menuOpen.set(false)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8.5h6M9 12h6"/></svg>
                    Modèle de reçu
                  </a>
                  <a role="menuitem" routerLink="/parametres" [queryParams]="{ onglet: 'abonnement' }" (click)="menuOpen.set(false)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12"/><path d="M3 10h18M7 14.5h3"/></svg>
                    Abonnement
                  </a>
                  <a role="menuitem" routerLink="/parametres" [queryParams]="{ onglet: 'utilisateurs' }" (click)="menuOpen.set(false)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg>
                    Utilisateurs
                  </a>
                  <a role="menuitem" routerLink="/parametres" [queryParams]="{ onglet: 'securite' }" (click)="menuOpen.set(false)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>
                    Sécurité
                  </a>
                </div>
                <div class="menu-list menu-list--end">
                  <a role="menuitem" routerLink="/login" (click)="menuOpen.set(false)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h5v16h-5"/><path d="M10 8l-4 4 4 4M6 12h10"/></svg>
                    Se déconnecter
                  </a>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </header>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 12;
      display: block;
    }

    /* At rest the bar is fully transparent, so whatever is behind the page
       (the home's classroom photo) shows edge to edge. */
    .bar {
      border-block-end: 1px solid transparent;
      background: transparent;
      transition: background-color var(--m-med) linear, border-color var(--m-med) linear, box-shadow var(--m-med) linear;
    }

    /* Once the page moves under it, the bar turns to frosted paper with a hairline. */
    .bar.is-scrolled {
      border-block-end-color: var(--m-line);
      background: color-mix(in srgb, var(--m-paper) 88%, transparent);
      backdrop-filter: blur(10px) saturate(1.2);
      -webkit-backdrop-filter: blur(10px) saturate(1.2);
      box-shadow: 0 8px 24px -22px rgba(22, 40, 31, 0.5);
    }

    .inner {
      display: flex;
      align-items: center;
      gap: 20px;
      height: 64px;
      padding-inline: 28px 20px;
    }

    /* ── Trail ── */
    .trail {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding-inline: 10px 14px;
      margin-inline-start: -10px;
      border-radius: var(--m-r-sm);
      color: var(--m-ink);
      font-size: 14px;
      font-weight: 600;
      transition: background-color var(--m-fast) linear, color var(--m-fast) linear;
    }

    .back svg {
      width: 19px;
      height: 19px;
      transition: transform var(--m-med) var(--m-ease);
    }

    .back:hover {
      background: var(--m-green-tint);
      color: var(--m-green-deep);
    }

    .back:hover svg { transform: translateX(-3px); }
    .back:active svg { transform: translateX(-5px); }
    [dir='rtl'] .back svg { transform: scaleX(-1); }
    [dir='rtl'] .back:hover svg { transform: scaleX(-1) translateX(-3px); }

    .back-sep {
      width: 1px;
      height: 22px;
      margin-inline-end: 4px;
      background: var(--m-line);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .brand-mark {
      flex: none;
      width: 34px;
      height: 34px;
      object-fit: contain;
      transition: transform var(--m-med) var(--m-ease);
    }

    .brand:hover .brand-mark {
      transform: rotate(-6deg);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.15;
    }

    .brand-name {
      font-size: 15.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .brand-centre {
      max-width: 180px;
      overflow: hidden;
      color: var(--m-ink-faint);
      font-size: 12px;
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .trail-sep {
      width: 15px;
      height: 15px;
      color: var(--m-ink-faint);
    }

    [dir='rtl'] .trail-sep { transform: scaleX(-1); }

    .trail-current {
      color: var(--m-ink);
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }

    /* ── Modules ── */
    /* Module links: a row of soft pills; the current one is filled. */
    .modules {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-inline: auto;
      padding: 4px;
      border: 1px solid var(--m-line-soft);
      border-radius: var(--m-r);
      background: color-mix(in srgb, var(--m-paper) 70%, transparent);
    }

    .module {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 36px;
      padding-inline: 12px;
      border-radius: var(--m-r-sm);
      color: var(--m-ink-soft);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      transition: color var(--m-fast) linear, background-color var(--m-fast) linear;
    }

    .module svg {
      width: 17px;
      height: 17px;
      transition: color var(--m-fast) linear;
    }

    .module:hover {
      color: var(--m-ink);
      background: var(--m-green-tint);
    }

    .module.is-on {
      background: var(--m-paper);
      color: var(--m-green-deep);
      box-shadow: 0 1px 2px rgba(15, 29, 22, 0.08), 0 0 0 1px var(--m-line);
    }

    .module.is-on svg {
      color: var(--m-green);
    }

    /* ── Account ── */
    .side {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-inline-start: auto;
    }

    .me-wrap {
      position: relative;
    }

    .me {
      display: flex;
      align-items: center;
      gap: 4px;
      height: 40px;
      padding: 2px 6px 2px 2px;
      border: 1px solid var(--m-line);
      border-radius: var(--m-r-pill);
      background: var(--m-paper);
      box-shadow: var(--m-shadow-sm);
      transition: border-color var(--m-fast) linear;
    }

    .me:hover,
    .me.is-open {
      border-color: var(--m-green);
    }

    .me-initials {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--m-green-tint);
      color: var(--m-green-deep);
      font-size: 13px;
      font-weight: 700;
    }

    .me-caret {
      width: 16px;
      height: 16px;
      color: var(--m-ink-soft);
      transition: transform var(--m-med) var(--m-ease);
    }

    .me.is-open .me-caret {
      transform: rotate(180deg);
    }

    .menu {
      position: absolute;
      inset-block-start: calc(100% + 8px);
      inset-inline-end: 0;
      z-index: 20;
      width: 280px;
      overflow: clip;
      background: var(--m-paper);
      border: 1px solid var(--m-line);
      border-radius: var(--m-r);
      box-shadow: var(--m-shadow-lg);
      transform-origin: top right;
    }

    .menu-enter { animation: menu-in var(--m-med) var(--m-ease) both; }
    .menu-leave { animation: menu-out var(--m-fast) linear both; }

    @keyframes menu-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    }

    @keyframes menu-out {
      to { opacity: 0; transform: translateY(-2px); }
    }

    .menu-head {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 14px 10px;
    }

    .menu-avatar {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--m-green);
      color: #fff;
      font-size: 14px;
      font-weight: 700;
    }

    .menu-who {
      display: flex;
      flex-direction: column;
      font-size: 14px;
      line-height: 1.25;
    }

    .menu-who span {
      color: var(--m-ink-faint);
      font-size: 12.5px;
    }

    .menu-centre {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin: 0 10px 8px;
      padding: 9px 10px;
      border-radius: var(--m-r-sm);
      background: var(--m-band);
      border: 1px solid var(--m-line-soft);
      font-size: 13.5px;
      font-weight: 600;
      transition: border-color var(--m-fast) linear;
    }

    .menu-centre:hover {
      border-color: var(--m-green);
    }

    .menu-centre-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .menu-plan {
      flex: none;
      padding: 1px 8px;
      border-radius: var(--m-r-pill);
      background: var(--m-green);
      color: #fff;
      font-size: 11.5px;
      font-weight: 700;
    }

    .menu-list {
      display: flex;
      flex-direction: column;
      padding: 6px;
      border-block-start: 1px solid var(--m-line-soft);
    }

    .menu-list a {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 38px;
      padding-inline: 8px;
      border-radius: 8px;
      color: var(--m-ink);
      font-size: 14px;
      transition: background-color var(--m-fast) linear, color var(--m-fast) linear;
    }

    .menu-list a svg {
      width: 17px;
      height: 17px;
      color: var(--m-ink-faint);
    }

    .menu-list a:hover,
    .menu-list a:focus-visible {
      background: var(--m-green-tint);
      color: var(--m-green-deep);
    }

    .menu-list a:hover svg {
      color: var(--m-green);
    }

    .menu-list--end a:hover {
      background: var(--m-late-wash);
      color: var(--m-late);
    }

    .menu-list--end a:hover svg {
      color: var(--m-late);
    }

    /* ── Narrower screens ── */
    @media (max-width: 1100px) {
      .module span {
        display: none;
      }

      .module {
        padding-inline: 11px;
      }
    }

    @media (max-width: 820px) {
      .modules,
      .brand-centre {
        display: none;
      }
    }

    @media (max-width: 560px) {
      .inner {
        height: 58px;
        padding-inline: 14px 12px;
        gap: 10px;
      }

      /* With a section shown, the mark alone is enough to find home;
         the back button keeps only its arrow, as a full 44px target. */
      .trail:has(.trail-current) .brand-text,
      .back-text {
        display: none;
      }

      .back {
        justify-content: center;
        width: 44px;
        height: 44px;
        padding: 0;
        margin-inline-start: -8px;
      }

      .back-sep {
        margin-inline-end: 2px;
      }

      .me-caret {
        display: none;
      }

      .menu {
        position: fixed;
        inset-block-start: 62px;
        inset-inline: 12px;
        width: auto;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .menu-enter,
      .menu-leave {
        animation-duration: 1ms;
      }
    }
  `,
})
export class AppBarComponent {
  readonly section = input<string>();
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private centreService = inject(CentreService);

  readonly centre = this.centreService.centreInfo;
  readonly plan = computed(() => this.centreService.subscription()?.plan ?? '');

  private auth = inject(AuthStore);
  readonly userName = computed(() => this.auth.user()?.name?.trim() ?? '');
  readonly isOwner = this.auth.isOwner;
  readonly initials = computed(() =>
    this.userName().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join(''),
  );

  constructor() {
    this.centreService.load();
    this.centreService.loadSubscription();
  }

  readonly links: NavLink[] = [
    { label: 'Groupes', route: '/groupes', icon: 'groupes' },
    { label: 'Caisse', route: '/caisse', icon: 'caisse' },
    { label: 'Enseignants', route: '/enseignants', icon: 'enseignants' },
    { label: 'Paramètres', route: '/parametres', icon: 'parametres' },
  ];

  readonly menuOpen = signal(false);
  readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 4);
  }

  /** Alt + ← also goes home, like the browser's own back gesture. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.menuOpen()) {
      this.menuOpen.set(false);
      return;
    }
    if (this.section() && event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.router.navigateByUrl('/accueil');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.querySelector('.me-wrap')?.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
