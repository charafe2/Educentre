import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CaisseStore, LEVELS, capitalize, money, monthLong, monthShort } from './caisse.store';

type SortKey = 'amount' | 'late' | 'name';

/** Impayés: everyone who owes money, most urgent first. */
@Component({
  selector: 'app-unpaid-tab',
  imports: [FormsModule],
  template: `
    <section class="summary" aria-label="Résumé des impayés">
      <div class="sum">
        <span class="sum-label">Total impayé</span>
        <strong class="sum-value is-late">{{ money(total()) }} <small>MAD</small></strong>
      </div>
      <div class="sum">
        <span class="sum-label">Élèves concernés</span>
        <strong class="sum-value">{{ store.unpaid().length }}</strong>
      </div>
      <div class="sum">
        <span class="sum-label">Mois en retard</span>
        <strong class="sum-value">{{ monthCount() }}</strong>
      </div>
      <div class="sum">
        <span class="sum-label">Retard le plus ancien</span>
        <strong class="sum-value">{{ oldest() }}</strong>
      </div>
    </section>

    <div class="controls">
      <label class="search">
        <span class="m-visually-hidden">Filtrer les impayés</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
        <input type="search" placeholder="Élève ou parent" autocomplete="off" [ngModel]="query()" (ngModelChange)="query.set($event)">
      </label>
      <label>
        <span class="m-visually-hidden">Niveau</span>
        <select class="m-select" [class.is-set]="level()" [ngModel]="level()" (ngModelChange)="level.set($event)">
          <option value="">Tous niveaux</option>
          @for (l of levels; track l) { <option [value]="l">{{ l }}</option> }
        </select>
      </label>
      <label class="sort">
        <span class="m-visually-hidden">Trier</span>
        <select class="m-select" [ngModel]="sort()" (ngModelChange)="sort.set($event)">
          <option value="amount">Montant le plus élevé</option>
          <option value="late">Retard le plus ancien</option>
          <option value="name">Nom de l’élève</option>
        </select>
      </label>
    </div>

    @if (rows().length) {
      <div class="list" role="list">
        @for (r of rows(); track r.student.id) {
          <article class="row" role="listitem" animate.enter="m-enter-fade">
            <span class="avatar" aria-hidden="true">{{ initials(r.student.name) }}</span>

            <div class="who">
              <span class="name">{{ r.student.name }}</span>
              <span class="meta">{{ r.student.level }}, parent : {{ r.student.parent }}, {{ r.student.phone }}</span>
            </div>

            <div class="chips" [attr.aria-label]="'Mois dus par ' + r.student.name">
              @for (m of r.months; track m.month) {
                <button type="button" class="chip" [class]="'chip s-' + m.status"
                  [attr.data-tip]="title(m.month) + ' : ' + money(m.rest) + ' MAD'"
                  [attr.aria-label]="'Encaisser ' + title(m.month) + ', ' + money(m.rest) + ' MAD'"
                  (click)="collect.emit({ studentId: r.student.id, month: m.month })">
                  {{ short(m.month) }} {{ m.month.slice(2, 4) }}
                </button>
              }
            </div>

            <div class="due">
              <strong>{{ money(r.total) }} <small>MAD</small></strong>
              <span [class.is-old]="r.late >= 2">{{ r.late === 0 ? 'ce mois-ci' : 'depuis ' + r.late + ' mois' }}</span>
            </div>

            <div class="acts">
              <button class="m-btn" type="button" (click)="copyReminder(r)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9.5L4 20z"/></svg>
                <span class="btn-text">Rappel</span>
              </button>
              <button class="m-btn m-btn--primary" type="button" (click)="collect.emit({ studentId: r.student.id, month: r.oldest! })">Encaisser</button>
            </div>
          </article>
        }
      </div>
    } @else {
      <div class="empty">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        <p class="empty-title">{{ store.unpaid().length ? 'Aucun impayé ne correspond' : 'Aucun impayé' }}</p>
        <p class="empty-text">{{ store.unpaid().length ? 'Retirez un filtre pour voir les autres élèves.' : 'Tous les élèves sont à jour.' }}</p>
      </div>
    }
  `,
  styleUrl: './unpaid-tab.component.css',
})
export class UnpaidTabComponent {
  readonly store = inject(CaisseStore);
  readonly collect = output<{ studentId: number; month: string }>();
  readonly notify = output<string>();

  readonly levels = LEVELS;
  readonly money = money;
  readonly short = monthShort;
  readonly title = (m: string) => capitalize(monthLong(m));

  readonly query = signal('');
  readonly level = signal('');
  readonly sort = signal<SortKey>('amount');

  readonly total = computed(() => this.store.unpaid().reduce((n, r) => n + r.total, 0));
  readonly monthCount = computed(() => this.store.unpaid().reduce((n, r) => n + r.months.length, 0));
  readonly oldest = computed(() => {
    const max = Math.max(0, ...this.store.unpaid().map(r => r.late));
    return max === 0 ? 'ce mois-ci' : `${max} mois`;
  });

  readonly rows = computed(() => {
    const q = normalize(this.query().trim());
    const by = this.sort();
    return this.store.unpaid()
      .filter(r => (!this.level() || r.student.level === this.level()) &&
        (!q || normalize(`${r.student.name} ${r.student.parent} ${r.student.code}`).includes(q)))
      .sort((a, b) => by === 'name' ? a.student.name.localeCompare(b.student.name)
        : by === 'late' ? b.late - a.late || b.total - a.total
        : b.total - a.total);
  });

  initials(name: string): string {
    const [a, b] = name.split(' ');
    return `${a?.charAt(0) ?? ''}${b?.charAt(0) ?? ''}`;
  }

  /** A ready-to-send WhatsApp / SMS message for the parent. */
  async copyReminder(r: { student: { name: string; parent: string }; months: Array<{ month: string }>; total: number }): Promise<void> {
    const months = r.months.map(m => monthLong(m.month)).join(', ');
    const text = `Bonjour ${r.student.parent}, nous vous rappelons que les frais de ${r.student.name} pour ${months} restent à régler (${money(r.total)} MAD). Merci de passer à l’accueil du centre. Centre Ibn Khaldoun`;
    try {
      await navigator.clipboard.writeText(text);
      this.notify.emit(`Rappel copié pour ${r.student.parent}. Collez-le dans WhatsApp.`);
    } catch {
      this.notify.emit('Copie impossible : autorisez le presse-papiers dans le navigateur.');
    }
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}
