import { DecimalPipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PackageMixItem, SuperadminApiService, SuperAdminInvoice } from '../../superadmin-api.service';

import { injectQuery } from '@tanstack/angular-query-experimental';

@Component({
  selector: 'app-superadmin-overview',
  imports: [RouterLink, NgClass, DecimalPipe],
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

  statusLabel(status: SuperAdminInvoice['status']) {
    return status === 'paid' ? 'Payée' : status === 'pending' ? 'À encaisser' : 'En retard';
  }
}
