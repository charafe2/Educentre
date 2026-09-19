import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CentreInvoice, ClientAccount, CreateCentreInvoicePayload, PackagePlan, SuperadminApiService } from '../../superadmin-api.service';

@Component({
  selector: 'app-superadmin-invoices',
  imports: [FormsModule, DatePipe, DecimalPipe],
  templateUrl: './superadmin-invoices.component.html',
  styleUrl: './superadmin-invoices.component.css'
})
export class SuperadminInvoicesComponent implements OnInit {
  private api = inject(SuperadminApiService);

  invoices = signal<CentreInvoice[]>([]);
  centres = signal<ClientAccount[]>([]);
  packages = signal<PackagePlan[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal('');

  form: CreateCentreInvoicePayload = this.emptyForm();

  private sumWhere(status: CentreInvoice['status']): number {
    return this.invoices().filter(i => i.status === status).reduce((sum, i) => sum + i.amount, 0);
  }

  pendingAmount = computed(() => this.sumWhere('pending'));
  paidAmount = computed(() => this.sumWhere('paid'));
  lateAmount = computed(() => this.sumWhere('late'));

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [invoices, centres, packages] = await Promise.all([
        this.api.getInvoices(),
        this.api.getCentres(),
        this.api.getPackages(),
      ]);
      this.invoices.set(invoices);
      this.centres.set(centres);
      this.packages.set(packages);
      this.form = this.emptyForm();
    } catch {
      this.error.set('Impossible de charger les factures centres.');
    } finally {
      this.loading.set(false);
    }
  }

  emptyForm(): CreateCentreInvoicePayload {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    return { centreId: 0, packagePlanId: null, packageName: '', amount: 0, issuedAt: today, dueDate: due, status: 'pending', notes: '' };
  }

  applyPackage(packageId: string): void {
    const plan = this.packages().find(item => item.id === Number(packageId));
    this.form.packagePlanId = plan?.id ?? null;
    this.form.packageName = plan?.name ?? '';
    this.form.amount = plan?.monthlyPrice ?? 0;
  }

  async createInvoice(): Promise<void> {
    if (!this.form.centreId || !this.form.packageName || this.form.amount <= 0) {
      this.error.set('Centre, package et montant sont requis.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const created = await this.api.createInvoice(this.form);
      this.invoices.update(list => [created, ...list]);
      this.form = this.emptyForm();
    } catch {
      this.error.set('Création de facture impossible. Vérifiez les champs.');
    } finally {
      this.saving.set(false);
    }
  }

  async markPaid(invoice: CentreInvoice): Promise<void> {
    try {
      const updated = await this.api.markInvoicePaid(invoice.id);
      this.invoices.update(list => list.map(item => item.id === updated.id ? updated : item));
    } catch {
      this.error.set('Impossible de marquer cette facture comme payée.');
    }
  }

  async remove(invoice: CentreInvoice): Promise<void> {
    if (!confirm(`Supprimer la facture ${invoice.invoiceNumber} ?`)) return;
    try {
      await this.api.deleteInvoice(invoice.id);
      this.invoices.update(list => list.filter(item => item.id !== invoice.id));
    } catch {
      this.error.set('Impossible de supprimer cette facture.');
    }
  }

  statusLabel(status: CentreInvoice['status']): string {
    return status === 'paid' ? 'Payée' : status === 'late' ? 'En retard' : status === 'cancelled' ? 'Annulée' : 'À encaisser';
  }

  /** Maps an invoice state onto the console's ledger tones. */
  statusTone(status: CentreInvoice['status']): string {
    return status === 'paid' ? 'paid' : status === 'late' ? 'late' : status === 'cancelled' ? 'idle' : 'due';
  }
}
