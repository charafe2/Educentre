import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientAccount, SuperadminApiService } from '../../superadmin-api.service';

@Component({
  selector: 'app-superadmin-clients',
  imports: [NgClass, FormsModule],
  templateUrl: './superadmin-clients.component.html',
  styleUrl: './superadmin-clients.component.css'
})
export class SuperadminClientsComponent implements OnInit {
  private api = inject(SuperadminApiService);

  clients = signal<ClientAccount[]>([]);
  loading = signal(false);
  pageError = signal('');

  searchQuery = signal('');
  filterStatus = signal<'all' | 'active' | 'trial' | 'suspended'>('all');

  filteredClients = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.filterStatus();
    return this.clients().filter(c => {
      const matchesSearch = !q ||
        c.centreName.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q);
      const matchesStatus = s === 'all' || c.status === s;
      return matchesSearch && matchesStatus;
    });
  });

  totalClients   = computed(() => this.clients().length);
  activeClients  = computed(() => this.clients().filter(c => c.status === 'active').length);
  trialClients   = computed(() => this.clients().filter(c => c.status === 'trial').length);
  totalStudents  = computed(() => this.clients().reduce((sum, c) => sum + c.studentsCount, 0));

  // Modal state
  showModal = signal(false);
  editingClientId = signal<number | null>(null);
  showPassword = signal(false);
  formError = signal('');
  saving = signal(false);

  centreTypes = ['Soutien scolaire', 'Langue', 'Informatique', 'Artistique', 'Musique', 'Sport'];
  plans: ClientAccount['plan'][] = ['Basique', 'Pro', 'Enterprise'];

  form: {
    centreName: string; centreType: string; city: string;
    ownerName: string; email: string; phone: string;
    password: string; plan: ClientAccount['plan'];
  } = this.emptyForm();

  ngOnInit(): void {
    void this.loadClients();
  }

  async loadClients(): Promise<void> {
    this.loading.set(true);
    this.pageError.set('');
    try {
      this.clients.set(await this.api.getCentres());
    } catch {
      this.pageError.set('Impossible de charger les centres.');
    } finally {
      this.loading.set(false);
    }
  }

  emptyForm() {
    return { centreName: '', centreType: 'Soutien scolaire', city: '', ownerName: '', email: '', phone: '', password: '', plan: 'Pro' as ClientAccount['plan'] };
  }

  openCreate() {
    this.editingClientId.set(null);
    this.form = this.emptyForm();
    this.formError.set('');
    this.showPassword.set(false);
    this.showModal.set(true);
  }

  openEdit(client: ClientAccount) {
    this.editingClientId.set(client.id);
    this.form = {
      centreName: client.centreName,
      centreType: client.centreType,
      city: client.city,
      ownerName: client.ownerName,
      email: client.email,
      phone: client.phone,
      password: '',
      plan: client.plan,
    };
    this.formError.set('');
    this.showPassword.set(false);
    this.showModal.set(true);
  }

  async submitSave() {
    const { centreName, ownerName, email, password } = this.form;
    const editingId = this.editingClientId();
    if (!centreName || !ownerName || !email || (!editingId && !password)) {
      this.formError.set('Les champs marqués * sont obligatoires.');
      return;
    }
    if (!editingId && password.length < 6) {
      this.formError.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (this.clients().some(c => c.email === email && c.id !== editingId)) {
      this.formError.set('Cet e-mail est déjà utilisé.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');
    try {
      const payload = {
        centreName: this.form.centreName,
        centreType: this.form.centreType,
        city: this.form.city,
        ownerName: this.form.ownerName,
        email: this.form.email,
        phone: this.form.phone,
        password: this.form.password || undefined,
        plan: this.form.plan,
      };

      if (editingId) {
        const updated = await this.api.updateCentre(editingId, payload);
        this.clients.update(list => list.map(c => c.id === editingId ? updated : c));
      } else {
        const created = await this.api.createCentre(payload);
        this.clients.update(list => [created, ...list]);
      }

      this.showModal.set(false);
    } catch {
      this.formError.set('Enregistrement impossible. Vérifiez les champs et réessayez.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleStatus(client: ClientAccount) {
    try {
      const updated = await this.api.toggleCentreStatus(client.id);
      this.clients.update(list => list.map(c => c.id === client.id ? updated : c));
    } catch {
      this.pageError.set('Impossible de modifier le statut du centre.');
    }
  }

  async deleteClient(client: ClientAccount) {
    if (!confirm(`Supprimer le compte de "${client.centreName}" ? Cette action est irréversible.`)) return;
    try {
      await this.api.deleteCentre(client.id);
      this.clients.update(list => list.filter(c => c.id !== client.id));
    } catch {
      this.pageError.set('Impossible de supprimer ce centre.');
    }
  }
}
