import { Component, computed, input } from '@angular/core';
import { InvoiceSettings } from './centre-settings.store';
import { CentreInfo } from '../services/centre.service';

/**
 * A receipt as the parent receives it, drawn from the centre's settings.
 * Paramètres renders it live beside the controls; Caisse can print it.
 * Sizes are in container units (cqi), so the A4 sheet scales to any width
 * and keeps its proportions.
 */

export interface InvoiceLine {
  label: string;
  detail: string;
  amount: number;
}

export interface InvoiceData {
  number: string;
  date: string;
  student: string;
  code: string;
  level: string;
  parent: string;
  month: string;
  method: string;
  lines: InvoiceLine[];
}

export const SAMPLE_INVOICE: Omit<InvoiceData, 'number'> = {
  date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  student: 'Adam Bennani',
  code: 'ELV-0142',
  level: '2e Bac',
  parent: 'Karima Bennani',
  month: capitalize(new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })),
  method: 'Espèces',
  lines: [
    { label: 'Mathématiques', detail: 'Groupe 1, M. Idrissi', amount: 400 },
    { label: 'Physique-Chimie', detail: 'Groupe 1, Mme Benjelloun', amount: 350 },
  ],
};

@Component({
  selector: 'app-invoice-preview',
  template: `
    <article
      class="sheet"
      [class.is-ticket]="settings().paper === 'ticket'"
      [class]="'tpl-' + settings().template"
      [style.--accent]="settings().accent"
      aria-label="Aperçu du reçu"
    >
      <header class="top">
        <div class="brand">
          @if (settings().showLogo) {
            @if (centre().logo) {
              <img class="logo" [src]="centre().logo" alt="">
            } @else {
              <span class="logo logo--mark" aria-hidden="true">{{ initials() }}</span>
            }
          }
          <div class="brand-text">
            <p class="centre">{{ centre().name || 'Nom du centre' }}</p>
            <p class="small">{{ addressLine() }}</p>
            <p class="small">{{ contactLine() }}</p>
          </div>
        </div>
        <div class="doc">
          <p class="doc-title">{{ settings().title || 'Reçu' }}</p>
          <p class="small">N° <strong>{{ data().number }}</strong></p>
          <p class="small">Le {{ data().date }}</p>
        </div>
      </header>

      <section class="parties">
        <div>
          <p class="label">Élève</p>
          <p class="strong">{{ data().student }}</p>
          <p class="small">
            @if (settings().showStudentCode) { {{ data().code }}, }
            {{ data().level }}
          </p>
          <p class="small">Parent : {{ data().parent }}</p>
        </div>
        <div class="period">
          <p class="label">Période</p>
          <p class="strong">{{ data().month }}</p>
          @if (settings().showMethod) {
            <p class="small">Paiement : {{ data().method }}</p>
          }
        </div>
      </section>

      <table class="lines">
        <thead>
          <tr><th>Désignation</th><th class="num">Montant</th></tr>
        </thead>
        <tbody>
          @for (l of data().lines; track l.label) {
            <tr>
              <td>
                <span class="strong">{{ l.label }}</span>
                @if (settings().showGroup) { <span class="small detail">{{ l.detail }}</span> }
              </td>
              <td class="num">{{ money(l.amount) }} MAD</td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr class="total"><td>Total payé</td><td class="num">{{ money(total()) }} MAD</td></tr>
        </tfoot>
      </table>

      <p class="words small">Arrêté le présent reçu à la somme de {{ money(total()) }} dirhams.</p>

      @if (settings().note) {
        <p class="note small">{{ settings().note }}</p>
      }

      <div class="end">
        @if (settings().showPaidStamp) {
          <span class="stamp" aria-hidden="true">Payé</span>
        }
        @if (settings().showSignature) {
          <div class="sign">
            <span class="small">Cachet et signature</span>
          </div>
        }
      </div>

      <footer class="foot">
        @if (settings().footer) { <p class="thanks">{{ settings().footer }}</p> }
        @if (settings().showLegal && legalLine()) { <p class="legal">{{ legalLine() }}</p> }
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
    }

    .sheet {
      --accent: #1f8a5b;
      --ink: #16281f;
      --soft: #5b6f64;
      --line: #dfe8e2;
      position: relative;
      display: flex;
      flex-direction: column;
      aspect-ratio: 210 / 297;
      padding: 7cqi 7.5cqi 5cqi;
      overflow: hidden;
      border-radius: 10px;
      background: #fff;
      color: var(--ink);
      font-size: 2.05cqi;
      line-height: 1.45;
      box-shadow: 0 1px 2px rgba(22, 40, 31, 0.08), 0 18px 40px -24px rgba(22, 40, 31, 0.45);
      transition: box-shadow var(--m-med, 220ms) ease;
    }

    .sheet * {
      transition: color 220ms linear, background-color 220ms linear, border-color 220ms linear;
    }

    p {
      margin: 0;
    }

    .small {
      color: var(--soft);
      font-size: 0.86em;
    }

    .strong {
      font-weight: 600;
    }

    .label {
      margin-block-end: 0.3em;
      color: var(--accent);
      font-size: 0.78em;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    /* ── Head ── */
    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4cqi;
      padding-block-end: 4cqi;
      border-block-end: 0.35cqi solid var(--accent);
    }

    .brand {
      display: flex;
      align-items: flex-start;
      gap: 2.6cqi;
      min-width: 0;
    }

    .logo {
      flex: none;
      width: 9cqi;
      height: 9cqi;
      object-fit: contain;
    }

    .logo--mark {
      display: grid;
      place-items: center;
      border-radius: 1.4cqi;
      background: var(--accent);
      color: #fff;
      font-size: 3.4cqi;
      font-weight: 800;
    }

    .brand-text {
      min-width: 0;
    }

    .centre {
      font-size: 1.55em;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      overflow-wrap: anywhere;
    }

    .doc {
      flex: none;
      text-align: end;
    }

    .doc-title {
      margin-block-end: 0.4em;
      color: var(--accent);
      font-size: 1.45em;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    /* ── Parties ── */
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4cqi;
      margin-block: 5cqi 4cqi;
    }

    .period {
      text-align: end;
    }

    /* ── Lines ── */
    .lines {
      width: 100%;
      border-collapse: collapse;
    }

    .lines th {
      padding: 1.4cqi 1.6cqi;
      background: color-mix(in srgb, var(--accent) 10%, #fff);
      color: var(--ink);
      font-size: 0.82em;
      font-weight: 700;
      text-align: start;
    }

    .lines td {
      padding: 1.8cqi 1.6cqi;
      border-block-end: 1px solid var(--line);
      vertical-align: top;
    }

    .detail {
      display: block;
    }

    .num {
      text-align: end !important;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .total td {
      padding-block: 2.2cqi;
      border-block-end: 0;
      color: var(--accent);
      font-size: 1.2em;
      font-weight: 800;
    }

    .words {
      margin-block-start: 2cqi;
      font-style: italic;
    }

    .note {
      margin-block-start: 3cqi;
      padding: 2cqi 2.4cqi;
      border-inline-start: 0.5cqi solid var(--accent);
      border-radius: 0 1cqi 1cqi 0;
      background: color-mix(in srgb, var(--accent) 6%, #fff);
      color: var(--ink);
    }

    /* ── Stamp & signature ── */
    .end {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 4cqi;
      margin-block-start: auto;
      padding-block-start: 5cqi;
    }

    .stamp {
      padding: 0.6cqi 2.6cqi;
      border: 0.5cqi solid var(--accent);
      border-radius: 1.2cqi;
      color: var(--accent);
      font-size: 2.8cqi;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      opacity: 0.85;
      transform: rotate(-8deg);
    }

    .sign {
      width: 32cqi;
      height: 13cqi;
      margin-inline-start: auto;
      padding: 1.4cqi;
      border: 1px dashed var(--line);
      border-radius: 1.2cqi;
    }

    .foot {
      margin-block-start: 4cqi;
      padding-block-start: 2.6cqi;
      border-block-start: 1px solid var(--line);
      text-align: center;
    }

    .thanks {
      font-weight: 600;
    }

    .legal {
      margin-block-start: 0.6em;
      color: var(--soft);
      font-size: 0.78em;
    }

    /* ── Template: bandeau (coloured header band) ── */
    .tpl-bandeau .top {
      margin: -7cqi -7.5cqi 0;
      padding: 6cqi 7.5cqi 5cqi;
      border: 0;
      background: var(--accent);
      color: #fff;
    }

    .tpl-bandeau .top .small,
    .tpl-bandeau .doc-title {
      color: rgba(255, 255, 255, 0.85);
    }

    .tpl-bandeau .doc-title {
      color: #fff;
    }

    .tpl-bandeau .logo--mark {
      background: #fff;
      color: var(--accent);
    }

    /* ── Template: minimal (ink only, accent on the total) ── */
    .tpl-minimal .top {
      border-block-end: 1px solid var(--line);
    }

    .tpl-minimal .label,
    .tpl-minimal .doc-title {
      color: var(--ink);
    }

    .tpl-minimal .lines th {
      background: none;
      border-block-end: 1px solid var(--ink);
      padding-inline: 0;
    }

    .tpl-minimal .lines td {
      padding-inline: 0;
    }

    .tpl-minimal .note {
      background: none;
      border-inline-start-color: var(--line);
    }

    /* ── Paper: 80 mm ticket ── */
    .sheet.is-ticket {
      width: min(100%, 320px);
      margin-inline: auto;
      aspect-ratio: auto;
      padding: 22px 20px 18px;
      font-family: ui-monospace, 'SF Mono', Consolas, monospace;
      font-size: 11.5px;
    }

    .is-ticket * {
      font-family: inherit !important;
    }

    .is-ticket .top {
      flex-direction: column;
      align-items: center;
      gap: 10px;
      margin: 0;
      padding: 0 0 12px;
      background: none;
      color: var(--ink);
      border-block-end: 1px dashed var(--ink);
      text-align: center;
    }

    .is-ticket .top .small { color: var(--soft); }

    .is-ticket .brand {
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .is-ticket .logo {
      width: 40px;
      height: 40px;
    }

    .is-ticket .logo--mark {
      background: var(--ink);
      color: #fff;
      font-size: 16px;
    }

    .is-ticket .centre {
      font-size: 15px;
    }

    .is-ticket .doc {
      text-align: center;
    }

    .is-ticket .doc-title {
      color: var(--ink);
      font-size: 13px;
      text-transform: uppercase;
    }

    .is-ticket .parties {
      grid-template-columns: 1fr;
      gap: 8px;
      margin-block: 12px;
    }

    .is-ticket .period {
      text-align: start;
    }

    .is-ticket .label {
      color: var(--ink);
    }

    .is-ticket .lines th {
      padding: 4px 0;
      background: none;
      border-block: 1px dashed var(--ink);
    }

    .is-ticket .lines td {
      padding: 6px 0;
      border-block-end: 0;
    }

    .is-ticket .total td {
      border-block-start: 1px dashed var(--ink);
      color: var(--ink);
      font-size: 13px;
    }

    .is-ticket .note {
      padding: 6px 0;
      border: 0;
      background: none;
    }

    .is-ticket .end {
      padding-block-start: 14px;
    }

    .is-ticket .stamp {
      font-size: 12px;
      border-width: 2px;
      border-color: var(--ink);
      color: var(--ink);
    }

    .is-ticket .sign {
      display: none;
    }

    .is-ticket .foot {
      margin-block-start: 14px;
      padding-block-start: 10px;
      border-block-start: 1px dashed var(--ink);
    }

    /* ── On paper: same sheet as on screen, kept on one A4 page ── */
    @media print {
      :host {
        max-width: 185mm;
        margin-inline: auto;
      }

      .sheet {
        border-radius: 0;
        box-shadow: none;
        break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `,
})
export class InvoicePreviewComponent {
  readonly centre = input.required<CentreInfo>();
  readonly settings = input.required<InvoiceSettings>();
  readonly data = input.required<InvoiceData>();

  readonly total = computed(() => this.data().lines.reduce((n, l) => n + l.amount, 0));

  readonly initials = computed(() =>
    (this.centre().name || 'C').replace(/^(centre|école|ecole)\s+/i, '').split(/\s+/).map(w => w.charAt(0)).join('').slice(0, 2).toUpperCase(),
  );

  readonly addressLine = computed(() => [this.centre().address, this.centre().city].filter(Boolean).join(', '));
  readonly contactLine = computed(() => [this.centre().phone && `Tél. ${this.centre().phone}`, this.centre().email].filter(Boolean).join(' · '));
  readonly legalLine = computed(() => {
    const c = this.centre();
    return [c.ice && `ICE ${c.ice}`, c.ifNumber && `IF ${c.ifNumber}`, c.rc && `RC ${c.rc}`, c.patente && `Patente ${c.patente}`].filter(Boolean).join(' · ');
  });

  money(n: number): string {
    return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
