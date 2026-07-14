import { DecimalPipe, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PackageMixItem, SuperadminApiService, SuperAdminInvoice } from '../../superadmin-api.service';

@Component({
  selector: 'app-superadmin-overview',
  imports: [RouterLink, NgClass, DecimalPipe],
  templateUrl: './superadmin-overview.component.html',
  styleUrl: './superadmin-overview.component.css'
})
export class SuperadminOverviewComponent implements OnInit {
  private api = inject(SuperadminApiService);

  invoices = signal<SuperAdminInvoice[]>([]);
  packageMix = signal<PackageMixItem[]>([]);
  loading = signal(false);
  error = signal('');
  summary = signal({ totalRevenue: 0, pendingAmount: 0, lateAmount: 0, paidCount: 0 });

  totalRevenue = computed(() => this.summary().totalRevenue);
  pendingAmount = computed(() => this.summary().pendingAmount);
  lateAmount = computed(() => this.summary().lateAmount);
  paidCount = computed(() => this.summary().paidCount);

  ngOnInit(): void {
    void this.loadOverview();
  }

  async loadOverview(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const overview = await this.api.getOverview();
      this.invoices.set(overview.invoices);
      this.packageMix.set(overview.packageMix);
      this.summary.set(overview.summary);
    } catch {
      this.error.set('Impossible de charger la vue super-admin.');
    } finally {
      this.loading.set(false);
    }
  }

  statusLabel(status: SuperAdminInvoice['status']) {
    return status === 'paid' ? 'Payée' : status === 'pending' ? 'À encaisser' : 'En retard';
  }
}
