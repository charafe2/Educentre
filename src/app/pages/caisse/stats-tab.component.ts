import { Component, computed, inject, signal } from '@angular/core';
import { CaisseStore, capitalize, money, monthLong, monthShort } from './caisse.store';
import { CountUpDirective } from '../../shared/count-up.directive';

/** Statistiques: how much came in, against what was expected. */
@Component({
  selector: 'app-stats-tab',
  imports: [CountUpDirective],
  template: `
    <section class="kpis" aria-label="Chiffres clés">
      <div class="kpi">
        <span class="kpi-label">Encaissé en {{ monthName(s().thisMonth.month) }}</span>
        <strong class="kpi-value"><span [countUp]="s().thisMonth.collected">{{ money(s().thisMonth.collected) }}</span> <small>MAD</small></strong>
        <span class="kpi-note" [class.is-up]="s().delta > 0" [class.is-down]="s().delta < 0">
          {{ s().delta > 0 ? '+' : '' }}{{ s().delta }} % par rapport à {{ monthName(s().lastMonth.month) }}
        </span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Taux de recouvrement {{ yearLabel() }}</span>
        <strong class="kpi-value"><span [countUp]="s().recovery">{{ s().recovery }}</span> <small>%</small></strong>
        <span class="meter" aria-hidden="true"><span class="meter-fill" [style.transform]="'scaleX(' + s().recovery / 100 + ')'"></span></span>
        <span class="kpi-note">{{ prevYearLabel() }} : {{ s().recoveryPrev }} %</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Reste à encaisser</span>
        <strong class="kpi-value is-late"><span [countUp]="unpaidTotal()">{{ money(unpaidTotal()) }}</span> <small>MAD</small></strong>
        <span class="kpi-note">{{ store.unpaid().length }} élèves en retard</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Aujourd’hui</span>
        <strong class="kpi-value"><span [countUp]="s().todayAmount">{{ money(s().todayAmount) }}</span> <small>MAD</small></strong>
        <span class="kpi-note">{{ s().todayCount }} {{ s().todayCount > 1 ? 'reçus' : 'reçu' }}</span>
      </div>
    </section>

    <section class="panel chart-panel" aria-labelledby="chart-title">
      <header class="panel-head">
        <div>
          <h3 id="chart-title">Encaissé et attendu, 12 derniers mois</h3>
          <p>{{ money(windowCollected()) }} MAD encaissés sur {{ money(windowExpected()) }} MAD attendus</p>
        </div>
        <ul class="legend" aria-label="Légende">
          <li><span class="key key-bar"></span>Encaissé</li>
          <li><span class="key key-tick"></span>Attendu</li>
        </ul>
      </header>

      <div class="chart" (mouseleave)="hover.set(null)">
        <div class="grid" aria-hidden="true">
          @for (t of ticks(); track t) {
            <span class="gridline" [style.bottom.%]="(t / top()) * 100"><span>{{ short(t) }}</span></span>
          }
        </div>
        <div class="bars">
          @for (p of s().series; track p.month; let i = $index) {
            <button
              type="button"
              class="col"
              [class.is-hover]="hover() === i"
              [class.is-current]="i === s().series.length - 1"
              [attr.aria-label]="title(p.month) + ' : ' + money(p.collected) + ' MAD encaissés sur ' + money(p.expected) + ' attendus'"
              (mouseenter)="hover.set(i)"
              (focus)="hover.set(i)"
              (blur)="hover.set(null)"
            >
              <span class="plot">
                @if (p.expected) {
                  <span class="bar" [style.height.%]="(p.collected / top()) * 100" [style.animation-delay.ms]="i * 30"></span>
                  <span class="tick" [style.bottom.%]="(p.expected / top()) * 100"></span>
                } @else {
                  <span class="none">—</span>
                }
              </span>
              <span class="col-label">{{ monthShortOf(p.month) }}</span>

              @if (hover() === i) {
                <span class="tip" [class.is-end]="i > 8" [class.is-start]="i < 2" role="tooltip">
                  <strong>{{ title(p.month) }}</strong>
                  @if (p.expected) {
                    <span><i class="key key-bar"></i>Encaissé : {{ money(p.collected) }} MAD</span>
                    <span><i class="key key-tick"></i>Attendu : {{ money(p.expected) }} MAD</span>
                    <span class="tip-rate">{{ rate(p) }} % recouvré</span>
                  } @else {
                    <span>Pas de cours ce mois-ci</span>
                  }
                </span>
              }
            </button>
          }
        </div>
      </div>

      <table class="m-visually-hidden">
        <caption>Encaissé et attendu par mois</caption>
        <tr><th>Mois</th><th>Encaissé (MAD)</th><th>Attendu (MAD)</th></tr>
        @for (p of s().series; track p.month) {
          <tr><td>{{ title(p.month) }}</td><td>{{ p.collected }}</td><td>{{ p.expected }}</td></tr>
        }
      </table>
    </section>

    <div class="split">
      <section class="panel" aria-labelledby="subject-title">
        <header class="panel-head">
          <div>
            <h3 id="subject-title">Par matière</h3>
            <p>12 derniers mois</p>
          </div>
        </header>
        <ul class="hbars">
          @for (r of s().bySubject; track r.subject; let i = $index) {
            <li>
              <span class="hbar-label">{{ r.subject }}</span>
              <span class="hbar-track"><span class="hbar-fill" [style.transform]="'scaleX(' + r.amount / subjectMax() + ')'" [style.animation-delay.ms]="i * 40"></span></span>
              <span class="hbar-value">{{ money(r.amount) }} <small>MAD</small></span>
            </li>
          }
        </ul>
      </section>

      <section class="panel" aria-labelledby="method-title">
        <header class="panel-head">
          <div>
            <h3 id="method-title">Par mode de paiement</h3>
            <p>12 derniers mois</p>
          </div>
        </header>
        <ul class="hbars">
          @for (r of s().byMethod; track r.method; let i = $index) {
            <li>
              <span class="hbar-label">{{ r.method }}</span>
              <span class="hbar-track"><span class="hbar-fill" [style.transform]="'scaleX(' + (s().windowTotal ? r.amount / s().windowTotal : 0) + ')'" [style.animation-delay.ms]="i * 40"></span></span>
              <span class="hbar-value">{{ pct(r.amount) }} <small>%</small></span>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
  styleUrl: './stats-tab.component.css',
})
export class StatsTabComponent {
  readonly store = inject(CaisseStore);
  readonly s = this.store.stats;
  readonly money = money;
  readonly hover = signal<number | null>(null);

  readonly monthShortOf = monthShort;
  readonly title = (m: string) => capitalize(monthLong(m));
  monthName(m: string): string {
    return monthLong(m).split(' ')[0];
  }

  readonly yearLabel = computed(() => { const y = +this.store.currentSchoolStart.slice(0, 4); return `${y}–${y + 1}`; });
  readonly prevYearLabel = computed(() => { const y = +this.store.previousSchoolStart.slice(0, 4); return `${y}–${y + 1}`; });
  readonly unpaidTotal = computed(() => this.store.unpaid().reduce((n, r) => n + r.total, 0));
  readonly windowCollected = computed(() => this.s().series.reduce((n, p) => n + p.collected, 0));
  readonly windowExpected = computed(() => this.s().series.reduce((n, p) => n + p.expected, 0));
  readonly subjectMax = computed(() => Math.max(1, ...this.s().bySubject.map(r => r.amount)));

  /** A round axis top and 4 even ticks under it. */
  readonly top = computed(() => {
    const max = this.s().max;
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const nice = [1, 2, 2.5, 5, 10].map(k => k * step).find(v => v * 4 >= max) ?? step * 10;
    return nice * 4;
  });
  readonly ticks = computed(() => [1, 2, 3, 4].map(i => (this.top() / 4) * i));

  short(n: number): string {
    return n >= 1000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k` : String(n);
  }

  rate(p: { collected: number; expected: number }): number {
    return p.expected ? Math.round((Math.min(p.collected, p.expected) / p.expected) * 100) : 0;
  }

  pct(amount: number): number {
    return this.s().windowTotal ? Math.round((amount / this.s().windowTotal) * 100) : 0;
  }
}
