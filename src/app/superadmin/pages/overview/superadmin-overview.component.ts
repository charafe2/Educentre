import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SuperadminApiService, SuperAdminInvoice } from '../../superadmin-api.service';

import { injectQuery } from '@tanstack/angular-query-experimental';

type LedgerSegment = {
  key: 'paid' | 'due' | 'late';
  label: string;
  amount: number;
  share: number;
};

@Component({
  selector: 'app-superadmin-overview',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './superadmin-overview.component.html',
  styleUrl: './superadmin-overview.component.css'
})
export class SuperadminOverviewComponent {
  private api = inject(SuperadminApiService);

  overviewQuery = injectQuery(() => ({
    queryKey: ['superadmin-overview'],
    queryFn: () => this.api.getOverview(),
  }));

  loading = computed(() => this.overviewQuery.isPending());
  error = computed(() => this.overviewQuery.isError() ? 'Impossible de charger la vue super-admin.' : '');

  invoices = computed(() => this.overviewQuery.data()?.invoices ?? []);
  packageMix = computed(() => this.overviewQuery.data()?.packageMix ?? []);

  totalRevenue = computed(() => this.overviewQuery.data()?.summary.totalRevenue ?? 0);
  pendingAmount = computed(() => this.overviewQuery.data()?.summary.pendingAmount ?? 0);
  lateAmount = computed(() => this.overviewQuery.data()?.summary.lateAmount ?? 0);
  paidCount = computed(() => this.overviewQuery.data()?.summary.paidCount ?? 0);

  /** What the month has actually brought in: billed, less what is still owed. */
  collectedAmount = computed(() =>
    Math.max(0, this.totalRevenue() - this.pendingAmount() - this.lateAmount())
  );

  /**
   * The three states of the month's money, as proportions of what was billed.
   * Drives the meter at the top of the page — one instrument instead of four
   * disconnected counters.
   */
  segments = computed<LedgerSegment[]>(() => {
    const total = this.totalRevenue();
    const parts: Omit<LedgerSegment, 'share'>[] = [
      { key: 'paid', label: 'Encaissé', amount: this.collectedAmount() },
      { key: 'due', label: 'À encaisser', amount: this.pendingAmount() },
      { key: 'late', label: 'En retard', amount: this.lateAmount() },
    ];
    return parts.map(part => ({
      ...part,
      share: total > 0 ? (part.amount / total) * 100 : 0,
    }));
  });

  collectedShare = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? Math.round((this.collectedAmount() / total) * 100) : 0;
  });

  /** Package bars are read against the biggest package, not an arbitrary scale. */
  private peakCentres = computed(() =>
    this.packageMix().reduce((max, item) => Math.max(max, item.centres), 0)
  );

  packageShare(centres: number): number {
    const peak = this.peakCentres();
    return peak > 0 ? Math.max(4, (centres / peak) * 100) : 0;
  }

  statusLabel(status: SuperAdminInvoice['status']) {
    return status === 'paid' ? 'Payée' : status === 'pending' ? 'À encaisser' : 'En retard';
  }

  statusTone(status: SuperAdminInvoice['status']) {
    return status === 'paid' ? 'paid' : status === 'pending' ? 'due' : 'late';
  }
}
