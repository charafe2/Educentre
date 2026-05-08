import { Component, signal, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CentreService } from '../../services/centre.service';
import { StudentsService } from '../../services/students.service';
import { TeachersService } from '../../services/teachers.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  roleType: 'admin' | 'manager' | 'teacher' | 'accountant';
  lastLogin: string;
}

@Component({
  selector: 'app-parametres',
  imports: [NgClass, FormsModule, ModalComponent],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css'
})
export class ParametresComponent {
  private centreService = inject(CentreService);
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private toast = inject(ToastService);

  activeTab = signal('centre');

  tabs = [
    { id: 'centre', label: 'Informations du centre', icon: 'fa-solid fa-building' },
    { id: 'users', label: 'Utilisateurs', icon: 'fa-solid fa-users' },
    { id: 'subscription', label: 'Abonnement', icon: 'fa-solid fa-credit-card' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell' },
    { id: 'integrations', label: 'Intégrations', icon: 'fa-solid fa-plug' },
  ];

  // Local copy of centreInfo for the form
  centreForm = { ...this.centreService.centreInfo() };

  centreTypes = ['Soutien scolaire', 'Langue', 'Informatique', 'Artistique'];

  users = signal<User[]>([
    { id: 1, name: 'Ahmed Berrada', email: 'a.berrada@centre.ma', role: 'Administrateur', roleType: 'admin', lastLogin: '08/05/2025' },
    { id: 2, name: 'Rachid Mansouri', email: 'r.mansouri@centre.ma', role: 'Professeur', roleType: 'teacher', lastLogin: '07/05/2025' },
    { id: 3, name: 'Samira Bouazza', email: 's.bouazza@centre.ma', role: 'Professeur', roleType: 'teacher', lastLogin: '08/05/2025' },
    { id: 4, name: 'Khadija Alami', email: 'k.alami@centre.ma', role: 'Gestionnaire', roleType: 'manager', lastLogin: '06/05/2025' },
    { id: 5, name: 'Younes Tazi', email: 'y.tazi@centre.ma', role: 'Comptable', roleType: 'accountant', lastLogin: '05/05/2025' },
  ]);

  showUserModal = signal(false);
  userForm = { name: '', email: '', role: 'Professeur', roleType: 'teacher' as User['roleType'] };

  subscriptionFeatures = [
    { label: 'Étudiants illimités', included: true },
    { label: 'Professeurs illimités', included: true },
    { label: 'Envoi WhatsApp automatique', included: true },
    { label: 'Rapports & Analytiques', included: true },
    { label: 'Sauvegarde cloud', included: true },
    { label: 'Support prioritaire', included: false },
    { label: 'API personnalisée', included: false },
  ];

  notifSettings = {
    paymentReminder: true,
    absenceAlert: true,
    newEnrollment: true,
    whatsappNotifs: true,
    emailReports: false,
  };

  saveCentreForm(): void {
    this.centreService.update({ ...this.centreForm });
    this.toast.show('Informations du centre enregistrées');
  }

  resetCentreForm(): void {
    this.centreForm = { ...this.centreService.centreInfo() };
  }

  openAddUser(): void {
    this.userForm = { name: '', email: '', role: 'Professeur', roleType: 'teacher' };
    this.showUserModal.set(true);
  }

  submitUser(): void {
    const id = Math.max(...this.users().map(u => u.id)) + 1;
    this.users.update(list => [...list, {
      id,
      name: this.userForm.name,
      email: this.userForm.email,
      role: this.userForm.role,
      roleType: this.userForm.roleType,
      lastLogin: '—',
    }]);
    this.toast.show('Utilisateur ajouté');
    this.showUserModal.set(false);
  }

  deleteUser(u: User): void {
    if (confirm(`Supprimer l'utilisateur ${u.name} ?`)) {
      this.users.update(list => list.filter(x => x.id !== u.id));
      this.toast.show('Utilisateur supprimé', 'info');
    }
  }

  saveNotifications(): void {
    this.toast.show('Paramètres de notifications enregistrés');
  }

  setTab(tabId: string): void { this.activeTab.set(tabId); }
}
