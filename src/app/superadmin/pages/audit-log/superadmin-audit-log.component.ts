import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AuditLogEntry, AuditLogFilters, ClientAccount, SuperadminApiService } from '../../superadmin-api.service';
import { PaginationMeta } from '../../../models/api-response.model';

@Component({
  selector: 'app-superadmin-audit-log',
  imports: [FormsModule, DatePipe],
  templateUrl: './superadmin-audit-log.component.html',
  styleUrl: './superadmin-audit-log.component.css'
})
export class SuperadminAuditLogComponent implements OnInit {
  private api = inject(SuperadminApiService);

  logs = signal<AuditLogEntry[]>([]);
  centres = signal<ClientAccount[]>([]);
  loading = signal(false);
  pageError = signal('');

  pagination = signal<PaginationMeta>({
    current_page: 1, per_page: 25, total: 0, last_page: 1, from: null, to: null,
  });

  // Filter draft state — applied to the request only on "Filtrer" (or Enter
  // in the search box), so picking a centre + module + date range doesn't
  // fire a request per keystroke/click.
  centreId = signal<number | null>(null);
  module = signal('');
  action = signal('');
  from = signal('');
  to = signal('');
  search = signal('');

  readonly modules = ['Authentification', 'Utilisateurs', 'Paiements', 'Groupes', 'Professeurs'];

  readonly actions: { key: string; label: string }[] = [
    { key: 'connexion', label: 'Connexion' },
    { key: 'deconnexion', label: 'Déconnexion' },
    { key: 'creation', label: 'Création' },
    { key: 'modification', label: 'Modification' },
    { key: 'suppression', label: 'Suppression' },
  ];

  ngOnInit(): void {
    void this.loadCentres();
    void this.load(1);
  }

  async loadCentres(): Promise<void> {
    try {
      this.centres.set(await this.api.getCentres());
    } catch {
      // Non-fatal: the centre filter just stays empty, the log still loads.
    }
  }

  async load(page = 1): Promise<void> {
    this.loading.set(true);
    this.pageError.set('');
    try {
      const filters: AuditLogFilters = { page, perPage: 25 };
      const centreId = this.centreId();
      if (centreId) filters.centreId = centreId;
      if (this.module()) filters.module = this.module();
      if (this.action()) filters.action = this.action();
      if (this.from()) filters.from = this.from();
      if (this.to()) filters.to = this.to();
      if (this.search().trim()) filters.search = this.search().trim();

      const res = await this.api.getAuditLogs(filters);
      this.logs.set(res.data);
      this.pagination.set(res.meta.pagination);
    } catch {
      this.pageError.set("Impossible de charger le journal d'audit.");
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    void this.load(1);
  }

  resetFilters(): void {
    this.centreId.set(null);
    this.module.set('');
    this.action.set('');
    this.from.set('');
    this.to.set('');
    this.search.set('');
    void this.load(1);
  }

  goToPage(page: number): void {
    const p = this.pagination();
    if (page < 1 || page > p.last_page || page === p.current_page) return;
    void this.load(page);
  }

  actionLabel(action: string): string {
    return this.actions.find(a => a.key === action)?.label ?? action;
  }

  /** Maps an action onto the console's existing badge tones. */
  actionTone(action: string): string {
    switch (action) {
      case 'creation':
      case 'connexion':
        return 'active';
      case 'modification':
        return 'pending';
      case 'suppression':
        return 'suspended';
      default:
        return 'inactive';
    }
  }
}
