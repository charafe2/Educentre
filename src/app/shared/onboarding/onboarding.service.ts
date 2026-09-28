import { Injectable, NgZone, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Driver, DriveStep, driver } from 'driver.js';
import { CentreStore } from '../centre.store';
import { TeachersService } from '../../services/teachers.service';
import { StudentsService } from '../../services/students.service';
import { PaymentsService } from '../../services/payments.service';

/**
 * Continuous onboarding for a centre still getting up and running.
 *
 * The steps are never ticked by hand: each one is done when the data says so
 * (a level exists, a subject exists, a group exists…). So the guide survives
 * reloads and page changes, picks up exactly where the centre stands, and
 * moves on the moment the user actually does the thing — not when they
 * click "Suivant".
 *
 * The first three steps (levels, subjects, group) get a full driver.js
 * spotlight tour, walking the owner to the exact button on the exact page.
 * The later three (teacher, student, payment) are real, data-driven steps
 * too — but with no dedicated spotlight built for them yet, so they only
 * show up in the checklist tab with a link to where they happen; see
 * `targetFor()`, which explicitly skips the tour for them.
 *
 * Pages register themselves with `enter(page)`; the service then highlights
 * whatever that page can do for the current step, with driver.js.
 */

export type OnboardingPage = 'accueil' | 'parametres' | 'groupes';
export type StepKey = 'levels' | 'subjects' | 'group' | 'teacher' | 'student' | 'payment';

export interface OnboardingStep {
  key: StepKey;
  label: string;
  hint: string;
  route: string;
  done: boolean;
}

const HIDDEN_KEY = 'm-onboarding-hidden';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private centre = inject(CentreStore);
  private teachersService = inject(TeachersService);
  private studentsService = inject(StudentsService);
  private paymentsService = inject(PaymentsService);
  private router = inject(Router);
  private zone = inject(NgZone);

  readonly steps = computed<OnboardingStep[]>(() => [
    {
      key: 'levels', label: 'Ajouter vos niveaux', hint: 'Collège, lycée, Bac…',
      route: '/parametres', done: this.centre.levels().length > 0,
    },
    {
      key: 'subjects', label: 'Ajouter vos matières', hint: 'Mathématiques, Français…',
      route: '/parametres', done: this.centre.subjects().length > 0,
    },
    {
      key: 'group', label: 'Créer votre premier groupe', hint: 'Niveau, matière, horaire',
      route: '/groupes', done: this.centre.groups().length > 0,
    },
    {
      key: 'teacher', label: 'Ajouter un enseignant', hint: 'Fiche et rémunération',
      route: '/enseignants', done: this.teachersService.teachers().length > 0,
    },
    {
      key: 'student', label: 'Ajouter un élève', hint: 'Niveau et classes',
      route: '/etudiants/nouveau', done: this.studentsService.students().length > 0,
    },
    {
      key: 'payment', label: 'Encaisser un premier paiement', hint: 'Depuis la Caisse',
      route: '/caisse', done: this.paymentsService.payments().some(p => p.amountPaid > 0),
    },
  ]);

  readonly current = computed(() => this.steps().find(s => !s.done) ?? null);
  readonly doneCount = computed(() => this.steps().filter(s => s.done).length);

  /** Still getting up and running until every step is done. */
  readonly active = computed(() => this.steps().some(s => !s.done));

  /** "Plus tard": the tour stops popping up, the checklist stays as a pill. */
  readonly hidden = signal(readHidden());

  /** Shown once, right after the first group is created. */
  readonly celebrate = signal(false);

  private page = signal<OnboardingPage | null>(null);
  /** Closed on this page for this step: don't re-open until something changes. */
  private dismissedHere = signal<string | null>(null);
  private tour: Driver | null = null;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    // One effect drives the whole guide: page × step × visibility.
    effect(() => {
      const page = this.page();
      const step = this.current();
      const active = this.active();
      const hidden = this.hidden();
      const dismissed = this.dismissedHere();
      untracked(() => this.schedule(page, step?.key ?? null, active && !hidden && dismissed !== `${page}:${step?.key}`));
    });

    // The first group closes the onboarding with a short celebration.
    let wasActive = this.active();
    effect(() => {
      const active = this.active();
      if (wasActive && !active) untracked(() => this.finish());
      wasActive = active;
    });
  }

  enter(page: OnboardingPage): void {
    this.dismissedHere.set(null);
    this.page.set(page);
  }

  leave(page: OnboardingPage): void {
    if (this.page() !== page) return;
    this.page.set(null);
    this.stopTour();
  }

  /** From the checklist: bring the guide back and go where the next step happens. */
  resume(): void {
    this.setHidden(false);
    this.dismissedHere.set(null);
    const step = this.current();
    if (!step) return;
    if (this.router.url.split('?')[0] !== step.route) {
      this.router.navigateByUrl(step.route);
    } else {
      this.schedule(this.page(), step.key, true);
    }
  }

  /** The page changed what is on screen (e.g. a tab): point again if needed. */
  refresh(): void {
    const step = this.current();
    this.schedule(this.page(), step?.key ?? null, this.active() && !this.hidden() && this.dismissedHere() !== `${this.page()}:${step?.key}`);
  }

  hide(): void {
    this.setHidden(true);
    this.stopTour();
  }

  private setHidden(value: boolean): void {
    this.hidden.set(value);
    try {
      if (value) localStorage.setItem(HIDDEN_KEY, '1');
      else localStorage.removeItem(HIDDEN_KEY);
    } catch { /* private mode: the choice lasts for this visit */ }
  }

  // ── Tour ──────────────────────────────────────────────────────────
  /** Waits for the page to render (and its enter animations) before pointing at it. */
  private schedule(page: OnboardingPage | null, step: StepKey | null, show: boolean): void {
    clearTimeout(this.timer);
    if (!page || !step || !show) {
      this.stopTour();
      return;
    }
    this.timer = setTimeout(() => this.show(page, step), this.tour?.isActive() ? 120 : 520);
  }

  private show(page: OnboardingPage, step: StepKey): void {
    const target = this.targetFor(page, step);
    if (!target) {
      this.stopTour();
      return;
    }
    const element = document.querySelector(target.element as string);
    // Never spotlight the page behind an open panel or dialog: the overlay
    // would sit on top of it and swallow the user's clicks.
    if (!element || document.querySelector('[aria-modal="true"]')) {
      this.stopTour();
      return;
    }

    this.zone.runOutsideAngular(() => {
      // Reusing the live instance slides the spotlight to the next target
      // instead of fading the whole overlay out and in again.
      if (!this.tour?.isActive()) this.tour = this.createTour(page, step);
      this.tour.highlight(target);
    });
  }

  private createTour(page: OnboardingPage, step: StepKey): Driver {
    return driver({
      animate: true,
      smoothScroll: true,
      allowClose: true,
      overlayColor: '#16281f',
      overlayOpacity: 0.42,
      stagePadding: 8,
      stageRadius: 14,
      popoverOffset: 14,
      popoverClass: 'm-tour',
      showButtons: ['close'],
      allowKeyboardControl: true,
      // Closing (Échap, ×, click outside) only mutes the guide on this page.
      onDestroyStarted: (_el, _step, { driver: d }) => {
        this.zone.run(() => this.dismissedHere.set(`${this.page()}:${this.current()?.key ?? step}`));
        d.destroy();
      },
      onDestroyed: () => {
        this.tour = null;
      },
    });
  }

  private stopTour(): void {
    clearTimeout(this.timer);
    if (this.tour?.isActive()) {
      const t = this.tour;
      this.tour = null;
      // Destroy without it counting as a user dismissal.
      t.setConfig({ ...t.getConfig(), onDestroyStarted: undefined });
      t.destroy();
    }
  }

  private progress(step: StepKey): string {
    const index = this.steps().findIndex(s => s.key === step) + 1;
    return `Étape ${index} sur ${this.steps().length}`;
  }

  private targetFor(page: OnboardingPage, step: StepKey): DriveStep | null {
    // Only the first three steps have a spotlight built for them — teacher/
    // student/payment live in the checklist tab only (a link to the right
    // page), not a guided walkthrough.
    if (step === 'teacher' || step === 'student' || step === 'payment') return null;

    const first = this.doneCount() === 0;
    const progress = this.progress(step);
    const pop = (title: string, description: string, side: 'top' | 'bottom' | 'left' | 'right' = 'bottom', align: 'start' | 'center' | 'end' = 'start') => ({
      title, description, side, align,
      // "Étape 2 sur 3" reads above the title, as an eyebrow.
      onPopoverRender: (p: { title: HTMLElement }) => {
        const eyebrow = document.createElement('span');
        eyebrow.className = 'm-tour-step';
        eyebrow.textContent = progress;
        p.title.before(eyebrow);
      },
    });

    if (page === 'accueil') {
      if (step === 'group') {
        return {
          element: '[data-tour="groupes"]',
          popover: pop('Place à votre premier groupe', 'Vos niveaux et vos matières sont prêts. Ouvrez Groupes pour créer le premier.', 'bottom', 'center'),
        };
      }
      return {
        element: '[data-tour="parametres"]',
        popover: pop(
          first ? 'Bienvenue sur Moujtahid' : 'On reprend ?',
          first
            ? 'Trois étapes pour lancer votre centre : vos niveaux, vos matières, puis votre premier groupe. Tout commence dans Paramètres.'
            : `Il reste ${3 - this.doneCount()} étapes avant votre premier groupe. On continue dans Paramètres.`,
          'bottom', 'center',
        ),
      };
    }

    if (page === 'parametres') {
      if (step === 'levels') {
        return {
          element: '#niveaux',
          popover: pop('Quels niveaux enseignez-vous ?', 'Touchez une suggestion ou tapez le vôtre. Un seul suffit pour continuer, vous pourrez en ajouter plus tard.', 'right'),
        };
      }
      if (step === 'subjects') {
        return {
          element: '#matieres',
          popover: pop('Et quelles matières ?', 'Parfait pour les niveaux. Ajoutez maintenant les matières proposées par le centre.', 'right'),
        };
      }
      return {
        element: '[data-tour="premier-groupe"]',
        popover: pop('Tout est prêt', 'Il ne reste qu’à créer votre premier groupe.', 'top', 'center'),
      };
    }

    // Groupes
    if (step === 'group') {
      return {
        element: '[data-tour="nouveau-groupe"]',
        popover: pop('Créez votre premier groupe', 'Choisissez le niveau, la matière et l’horaire. Vous inscrirez les élèves ensuite.', 'bottom', 'end'),
        onHighlighted: el => {
          // The create panel opens over the page: step aside as soon as it's asked for.
          el?.addEventListener('click', () => this.zone.run(() => {
            this.dismissedHere.set(`groupes:group`);
            this.stopTour();
          }), { once: true });
        },
      };
    }
    return {
      element: '[data-tour="parametres-link"]',
      popover: pop('Il manque quelque chose', 'Ajoutez d’abord vos niveaux et vos matières dans Paramètres.', 'bottom', 'start'),
    };
  }

  private finish(): void {
    this.stopTour();
    this.setHidden(false);
    this.celebrate.set(true);
    this.zone.runOutsideAngular(() => {
      const d = driver({
        animate: true,
        overlayColor: '#16281f',
        overlayOpacity: 0.42,
        popoverClass: 'm-tour m-tour--done',
        onDestroyed: () => this.zone.run(() => this.celebrate.set(false)),
      });
      setTimeout(() => d.highlight({
        popover: {
          title: 'Votre centre est opérationnel',
          description: 'Niveaux, matières, groupe, enseignant, élève et premier paiement : tout y est. Vous êtes prêt à faire tourner le centre au quotidien.',
          showButtons: ['next'],
          nextBtnText: 'C’est parti',
          doneBtnText: 'C’est parti',
          onNextClick: () => d.destroy(),
        },
      }), 450);
    });
  }
}

function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}
