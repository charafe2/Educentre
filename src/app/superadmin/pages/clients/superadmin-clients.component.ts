import { Component, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ClientAccount {
  id: number;
  centreName: string;
  centreType: string;
  city: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: 'Basique' | 'Pro' | 'Enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  studentsCount: number;
}

@Component({
  selector: 'app-superadmin-clients',
  imports: [NgClass, FormsModule],
  templateUrl: './superadmin-clients.component.html',
  styleUrl: './superadmin-clients.component.css'
})
export class SuperadminClientsComponent {

  clients = signal<ClientAccount[]>([
    { id: 1, centreName: 'Centre Al Moujtahid', centreType: 'Soutien scolaire', city: 'Casablanca', ownerName: 'Ahmed Berrada', email: 'admin@moujtahid.ma', phone: '+212 6 12 34 56 78', plan: 'Pro', status: 'active', createdAt: '12/01/2025', studentsCount: 148 },
    { id: 2, centreName: 'École de Langue Avenir', centreType: 'Langue', city: 'Rabat', ownerName: 'Fatima Zahra El Idrissi', email: 'f.elidrissi@avenir.ma', phone: '+212 6 98 76 54 32', plan: 'Basique', status: 'active', createdAt: '03/03/2025', studentsCount: 64 },
    { id: 3, centreName: 'TechKids Marrakech', centreType: 'Informatique', city: 'Marrakech', ownerName: 'Youssef Bennani', email: 'y.bennani@techkids.ma', phone: '+212 6 55 44 33 22', plan: 'Pro', status: 'trial', createdAt: '28/04/2025', studentsCount: 32 },
    { id: 4, centreName: 'Art & Culture Fès', centreType: 'Artistique', city: 'Fès', ownerName: 'Nadia Chraibi', email: 'n.chraibi@artculture.ma', phone: '+212 6 77 88 99 00', plan: 'Enterprise', status: 'active', createdAt: '15/02/2025', studentsCount: 210 },
    { id: 5, centreName: 'Centre Atlas', centreType: 'Soutien scolaire', city: 'Agadir', ownerName: 'Rachid Ouali', email: 'r.ouali@atlascentre.ma', phone: '+212 6 11 22 33 44', plan: 'Basique', status: 'suspended', createdAt: '20/01/2025', studentsCount: 89 },
  ]);

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
  showPassword = signal(false);
  formError = signal('');

  centreTypes = ['Soutien scolaire', 'Langue', 'Informatique', 'Artistique', 'Musique', 'Sport'];
  plans: ClientAccount['plan'][] = ['Basique', 'Pro', 'Enterprise'];

  form: {
    centreName: string; centreType: string; city: string;
    ownerName: string; email: string; phone: string;
    password: string; plan: ClientAccount['plan'];
  } = this.emptyForm();

  emptyForm() {
    return { centreName: '', centreType: 'Soutien scolaire', city: '', ownerName: '', email: '', phone: '', password: '', plan: 'Pro' as ClientAccount['plan'] };
  }

  openCreate() {
    this.form = this.emptyForm();
    this.formError.set('');
    this.showPassword.set(false);
    this.showModal.set(true);
  }

  submitCreate() {
    const { centreName, ownerName, email, password } = this.form;
    if (!centreName || !ownerName || !email || !password) {
      this.formError.set('Les champs marqués * sont obligatoires.');
      return;
    }
    if (password.length < 6) {
      this.formError.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (this.clients().some(c => c.email === email)) {
      this.formError.set('Cet e-mail est déjà utilisé.');
      return;
    }
    const id = Math.max(...this.clients().map(c => c.id)) + 1;
    const today = new Date().toLocaleDateString('fr-FR');
    this.clients.update(list => [...list, {
      id,
      centreName: this.form.centreName,
      centreType: this.form.centreType,
      city: this.form.city,
      ownerName: this.form.ownerName,
      email: this.form.email,
      phone: this.form.phone,
      plan: this.form.plan,
      status: 'trial',
      createdAt: today,
      studentsCount: 0,
    }]);
    this.showModal.set(false);
  }

  toggleStatus(client: ClientAccount) {
    this.clients.update(list => list.map(c =>
      c.id === client.id
        ? { ...c, status: c.status === 'suspended' ? 'active' : 'suspended' }
        : c
    ));
  }

  deleteClient(client: ClientAccount) {
    if (!confirm(`Supprimer le compte de "${client.centreName}" ? Cette action est irréversible.`)) return;
    this.clients.update(list => list.filter(c => c.id !== client.id));
  }
}
