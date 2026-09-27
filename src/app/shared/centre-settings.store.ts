import { Injectable, signal } from '@angular/core';

/**
 * Centre identity, invoice layout and subscription, shared by Paramètres
 * (which edits them) and Caisse (which prints with them).
 *
 * Static for now: saved in this browser only. Wiring means CentreService
 * (GET/PUT /v1/centre/settings) for `centre`, a server-side copy of
 * `invoice` (today ReceiptCustomizationService keeps it in localStorage too),
 * and the tenant's package for `subscription`.
 */

export interface CentreInfo {
  logo: string;
  name: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  /** Moroccan company identifiers, printed on invoices when filled. */
  ice: string;
  ifNumber: string;
  rc: string;
  patente: string;
}

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

export type PlanKey = 'essentiel' | 'pro' | 'entreprise';
export type Cycle = 'mensuel' | 'annuel';

export interface Plan {
  key: PlanKey;
  name: string;
  monthly: number;
  pitch: string;
  limits: { students: number | null; teachers: number | null; users: number };
  features: string[];
}

export interface BillingInvoice {
  number: string;
  date: string;
  period: string;
  amount: number;
  status: 'payée' | 'à payer';
}

export const CENTRE_TYPES = ['Soutien scolaire', 'Centre de langues', 'Informatique', 'École privée', 'Artistique', 'Autre'];

export const ACCENTS = ['#1f8a5b', '#0f766e', '#1d4ed8', '#6b21a8', '#be185d', '#c2410c', '#16281f'];

/** Annual billing: 12 months for the price of 10. */
export const ANNUAL_MONTHS = 10;

export const PLANS: Plan[] = [
  {
    key: 'essentiel', name: 'Essentiel', monthly: 250, pitch: 'Pour démarrer un petit centre.',
    limits: { students: 100, teachers: 5, users: 1 },
    features: ['Groupes et emploi du temps', 'Caisse et reçus', 'Rappels d’impayés par WhatsApp'],
  },
  {
    key: 'pro', name: 'Pro', monthly: 450, pitch: 'Le choix de la plupart des centres.',
    limits: { students: 400, teachers: 20, users: 3 },
    features: ['Tout Essentiel', 'Espace parents', 'Salaires des enseignants', 'Statistiques et revue mensuelle'],
  },
  {
    key: 'entreprise', name: 'Entreprise', monthly: 850, pitch: 'Plusieurs centres, une seule équipe.',
    limits: { students: null, teachers: null, users: 10 },
    features: ['Tout Pro', 'Multi-centres', 'Support prioritaire', 'Accès API'],
  },
];

const DEFAULT_CENTRE: CentreInfo = {
  logo: '',
  name: 'Centre Ibn Khaldoun',
  type: 'Soutien scolaire',
  city: 'Casablanca',
  address: '24, rue Ibnou Mounir, Maârif',
  phone: '05 22 98 76 54',
  whatsapp: '06 61 23 45 67',
  email: 'contact@ibnkhaldoun.ma',
  website: '',
  ice: '002145678000012',
  ifNumber: '45123678',
  rc: '512347',
  patente: '35214789',
};

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

  readonly centre = signal<CentreInfo>({ ...DEFAULT_CENTRE, ...this.saved.centre });
  readonly invoice = signal<InvoiceSettings>({ ...DEFAULT_INVOICE, ...this.saved.invoice });

  // Subscription: read-only demo state, changed through `changePlan`.
  readonly plan = signal<PlanKey>(this.saved.plan ?? 'pro');
  readonly cycle = signal<Cycle>(this.saved.cycle ?? 'mensuel');
  readonly renewsOn = signal(nextRenewal());
  readonly usage = { students: 187, teachers: 7, users: 2 };
  readonly billing = signal<BillingInvoice[]>(history());
  /** Cancelled: stays usable until `renewsOn`, then stops. */
  readonly cancelled = signal<boolean>(this.saved.cancelled ?? false);

  saveCentre(value: CentreInfo): void {
    this.centre.set({ ...value });
    this.persist();
  }

  saveInvoice(value: InvoiceSettings): void {
    this.invoice.set({ ...value });
    this.persist();
  }

  defaults(): { centre: CentreInfo; invoice: InvoiceSettings } {
    return { centre: { ...DEFAULT_CENTRE }, invoice: { ...DEFAULT_INVOICE } };
  }

  changePlan(plan: PlanKey, cycle: Cycle): void {
    this.plan.set(plan);
    this.cycle.set(cycle);
    this.cancelled.set(false);
    this.persist();
  }

  setCancelled(value: boolean): void {
    this.cancelled.set(value);
    this.persist();
  }

  /** Next receipt number as printed: prefix + zero-padded counter. */
  numberFor(s: Pick<InvoiceSettings, 'prefix' | 'nextNumber'>): string {
    return `${s.prefix}${String(Math.max(1, Math.floor(s.nextNumber || 1))).padStart(6, '0')}`;
  }

  private persist(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        centre: this.centre(), invoice: this.invoice(), plan: this.plan(), cycle: this.cycle(), cancelled: this.cancelled(),
      }));
    } catch { /* storage unavailable: kept for this visit */ }
  }
}

export function planOf(key: PlanKey): Plan {
  return PLANS.find(p => p.key === key)!;
}

/** Price actually charged per billing period. */
export function priceFor(plan: Plan, cycle: Cycle): number {
  return cycle === 'annuel' ? plan.monthly * ANNUAL_MONTHS : plan.monthly;
}

function read(): Partial<{ centre: CentreInfo; invoice: InvoiceSettings; plan: PlanKey; cycle: Cycle; cancelled: boolean }> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function nextRenewal(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}

function history(): BillingInvoice[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return {
      number: `MJ-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-0417`,
      date: d.toISOString(),
      period: period.charAt(0).toUpperCase() + period.slice(1),
      amount: 450,
      status: 'payée',
    };
  });
}
