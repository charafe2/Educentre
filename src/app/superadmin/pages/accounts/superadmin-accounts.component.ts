import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { SaveSuperAdminAccountPayload, SuperAdminAccount, SuperadminApiService } from '../../superadmin-api.service';

@Component({
  selector: 'app-superadmin-accounts',
  imports: [FormsModule, NgClass],
  templateUrl: './superadmin-accounts.component.html',
  styleUrl: './superadmin-accounts.component.css'
})
export class SuperadminAccountsComponent implements OnInit {
  private api = inject(SuperadminApiService);

  accounts = signal<SuperAdminAccount[]>([]);
  selectedId = signal<number | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal('');

  form: SaveSuperAdminAccountPayload = this.emptyForm();
  editing = computed(() => this.selectedId() !== null);
  activeCount = computed(() => this.accounts().filter(account => account.status === 'active').length);
  suspendedCount = computed(() => this.accounts().filter(account => account.status === 'suspended').length);

  ngOnInit(): void { void this.loadAccounts(); }

  async loadAccounts(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const accounts = await this.api.getAccounts();
      this.accounts.set(accounts);
      if (accounts[0]) this.selectAccount(accounts[0]);
    } catch {
      this.error.set('Impossible de charger les comptes super-admin.');
    } finally {
      this.loading.set(false);
    }
  }

  emptyForm(): SaveSuperAdminAccountPayload {
    return { name: '', email: '', password: '', status: 'active' };
  }

  newAccount(): void {
    this.selectedId.set(null);
    this.form = this.emptyForm();
  }

  selectAccount(account: SuperAdminAccount): void {
    this.selectedId.set(account.id);
    this.form = { name: account.name, email: account.email, password: '', status: account.status };
  }

  async save(): Promise<void> {
    if (!this.form.name || !this.form.email || (!this.editing() && !this.form.password)) {
      this.error.set('Nom, email et mot de passe initial sont requis.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const payload = { ...this.form, password: this.form.password || undefined };
      if (this.selectedId()) {
        const updated = await this.api.updateAccount(this.selectedId()!, payload);
        this.accounts.update(list => list.map(item => item.id === updated.id ? updated : item));
      } else {
        const created = await this.api.createAccount(payload);
        this.accounts.update(list => [created, ...list]);
        this.selectAccount(created);
      }
      this.form.password = '';
    } catch {
      this.error.set('Enregistrement impossible. Vérifiez que l’email est unique.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggle(account: SuperAdminAccount): Promise<void> {
    try {
      const updated = await this.api.toggleAccountStatus(account.id);
      this.accounts.update(list => list.map(item => item.id === updated.id ? updated : item));
      if (this.selectedId() === updated.id) this.selectAccount(updated);
    } catch {
      this.error.set('Impossible de modifier ce statut.');
    }
  }

  statusLabel(status: SuperAdminAccount['status']): string {
    return status === 'active' ? 'Actif' : 'Suspendu';
  }

  async remove(account: SuperAdminAccount): Promise<void> {
    if (!confirm(`Supprimer le compte ${account.email} ?`)) return;
    try {
      await this.api.deleteAccount(account.id);
      this.accounts.update(list => list.filter(item => item.id !== account.id));
      this.newAccount();
    } catch {
      this.error.set('Impossible de supprimer ce compte.');
    }
  }
}
