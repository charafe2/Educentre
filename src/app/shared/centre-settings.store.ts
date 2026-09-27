import { Injectable, signal } from '@angular/core';

/**
 * Receipt/invoice template settings, shared by Paramètres (which edits them)
 * and Caisse (which prints with them).
 *
 * Static for now: saved in this browser only. Centre identity and
 * subscription used to live here too — they're now real, served by
 * CentreService (GET/PUT /v1/settings/centre, GET /v1/settings/subscription).
 * Wiring the receipt template itself means a server-side copy (today
 * ReceiptCustomizationService keeps its own equivalent in localStorage too).
 */

export type InvoiceTemplate = 'classique' | 'bandeau' | 'minimal';
export type InvoicePaper = 'a4' | 'ticket';

export interface InvoiceSettings {
  template: InvoiceTemplate;
  paper: InvoicePaper;
  accent: string;
  title: string;
  prefix: string;
  nextNumber: number;
  showLogo: boolean;
  showLegal: boolean;
  showStudentCode: boolean;
  showGroup: boolean;
  showMethod: boolean;
  showSignature: boolean;
  showPaidStamp: boolean;
  note: string;
  footer: string;
}

export const ACCENTS = ['#1f8a5b', '#0f766e', '#1d4ed8', '#6b21a8', '#be185d', '#c2410c', '#16281f'];

const DEFAULT_INVOICE: InvoiceSettings = {
  template: 'classique',
  paper: 'a4',
  accent: '#1f8a5b',
  title: 'Reçu de paiement',
  prefix: 'REC-2026-',
  nextNumber: 126,
  showLogo: true,
  showLegal: true,
  showStudentCode: true,
  showGroup: true,
  showMethod: true,
  showSignature: true,
  showPaidStamp: true,
  note: 'Les mensualités sont payables avant le 5 de chaque mois.',
  footer: 'Merci pour votre confiance.',
};

const KEY = 'm-centre-settings-v1';

@Injectable({ providedIn: 'root' })
export class CentreSettingsStore {
  private saved = read();

  readonly invoice = signal<InvoiceSettings>({ ...DEFAULT_INVOICE, ...this.saved.invoice });

  saveInvoice(value: InvoiceSettings): void {
    this.invoice.set({ ...value });
    this.persist();
  }

  defaults(): { invoice: InvoiceSettings } {
    return { invoice: { ...DEFAULT_INVOICE } };
  }

  /** Next receipt number as printed: prefix + zero-padded counter. */
  numberFor(s: Pick<InvoiceSettings, 'prefix' | 'nextNumber'>): string {
    return `${s.prefix}${String(Math.max(1, Math.floor(s.nextNumber || 1))).padStart(6, '0')}`;
  }

  private persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ invoice: this.invoice() }));
    } catch { /* storage unavailable: kept for this visit */ }
  }
}

function read(): Partial<{ invoice: InvoiceSettings }> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}
