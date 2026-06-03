import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CentreService } from '../../services/centre.service';
import { StudentsService } from '../../services/students.service';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { GroupsService, DEFAULT_CAPACITY } from '../../services/groups.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../auth/auth.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Classe } from '../../models/classe.model';

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
export class ParametresComponent implements OnInit {
  private centreService = inject(CentreService);
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private groupsService = inject(GroupsService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  activeTab = signal('centre');

  tabs = [
    { id: 'centre', label: 'Informations du centre', icon: 'fa-solid fa-building' },
    { id: 'matieres', label: 'Matières & Classes', icon: 'fa-solid fa-book-open' },
    { id: 'users', label: 'Utilisateurs', icon: 'fa-solid fa-users' },
    { id: 'securite', label: 'Sécurité', icon: 'fa-solid fa-lock' },
    { id: 'subscription', label: 'Abonnement', icon: 'fa-solid fa-credit-card' },
    { id: 'notifications', label: 'Notifications', icon: 'fa-solid fa-bell' },
    { id: 'integrations', label: 'Intégrations', icon: 'fa-solid fa-plug' },
  ];

  centreForm = { ...this.centreService.centreInfo() };
  saving = signal(false);

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

  ngOnInit(): void {
    this.loadCentreSettings();
  }

  async loadCentreSettings(): Promise<void> {
    await this.centreService.load();
    this.centreForm = { ...this.centreService.centreInfo() };
  }

  async saveCentreForm(): Promise<void> {
    this.saving.set(true);
    try {
      await this.centreService.update({ ...this.centreForm });
      this.toast.show('Informations du centre enregistrées');
    } catch (err: unknown) {
      const message = extractValidationError(err);
      this.toast.show(message);
    } finally {
      this.saving.set(false);
    }
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

  // Security — password change
  passwordForm = { current: '', newPw: '', confirm: '' };
  showCurrent  = signal(false);
  showNew      = signal(false);
  showConfirm  = signal(false);
  passwordError = signal('');
  changingPassword = signal(false);

  async changePassword(): Promise<void> {
    this.passwordError.set('');
    const { current, newPw, confirm } = this.passwordForm;

    if (!current || !newPw || !confirm) {
      this.passwordError.set('Tous les champs sont obligatoires.');
      return;
    }

    this.changingPassword.set(true);
    const error = await this.auth.changePassword(current, newPw, confirm);
    this.changingPassword.set(false);

    if (error) {
      this.passwordError.set(error);
      return;
    }

    this.passwordForm = { current: '', newPw: '', confirm: '' };
    this.toast.show('Mot de passe modifié avec succès');
  }

  // ── Matières ──────────────────────────────────────────────
  allTeachers = this.teachersService.teachers;

  colorPresets = [
    { color: '#1d4ed8', bgColor: '#dbeafe' },
    { color: '#c2410c', bgColor: '#ffedd5' },
    { color: '#166534', bgColor: '#dcfce7' },
    { color: '#0f766e', bgColor: '#ccfbf1' },
    { color: '#6b21a8', bgColor: '#f3e8ff' },
    { color: '#be185d', bgColor: '#fce7f3' },
    { color: '#b45309', bgColor: '#fef3c7' },
    { color: '#0369a1', bgColor: '#e0f2fe' },
  ];

  classesByLevel = computed(() => {
    const map = new Map<string, Classe[]>();
    for (const c of this.classesService.classes()) {
      if (!map.has(c.level)) map.set(c.level, []);
      map.get(c.level)!.push(c);
    }
    return Array.from(map.entries()).map(([level, classes]) => ({ level, classes }));
  });

  showMatiereModal = signal(false);
  editingMatiere = signal<Classe | null>(null);

  matiereForm = {
    name: '', subject: '', level: '', teacherId: null as number | null,
    maxCapacity: 15, monthlyPrice: 0,
    status: 'active' as 'active' | 'inactive',
    color: '#1d4ed8', bgColor: '#dbeafe',
  };

  openAddMatiere(): void {
    this.editingMatiere.set(null);
    this.matiereForm = {
      name: '', subject: '', level: '', teacherId: this.allTeachers()[0]?.id ?? null,
      maxCapacity: 15, monthlyPrice: 300,
      status: 'active', color: '#1d4ed8', bgColor: '#dbeafe',
    };
    this.showMatiereModal.set(true);
  }

  openEditMatiere(c: Classe): void {
    this.editingMatiere.set(c);
    this.matiereForm = {
      name: c.name, subject: c.subject, level: c.level,
      teacherId: c.teacherId, maxCapacity: c.maxCapacity,
      monthlyPrice: c.monthlyPrice, status: c.status,
      color: c.color, bgColor: c.bgColor,
    };
    this.showMatiereModal.set(true);
  }

  selectColor(preset: { color: string; bgColor: string }): void {
    this.matiereForm.color = preset.color;
    this.matiereForm.bgColor = preset.bgColor;
  }

  submitMatiere(): void {
    const f = this.matiereForm;
    if (!f.name.trim() || !f.subject.trim() || !f.level.trim()) {
      this.toast.show('Veuillez remplir tous les champs obligatoires');
      return;
    }
    const ec = this.editingMatiere();
    if (ec) {
      this.classesService.update(ec.id, {
        name: f.name.trim(), subject: f.subject.trim(), level: f.level.trim(),
        teacherId: f.teacherId, maxCapacity: +f.maxCapacity,
        monthlyPrice: +f.monthlyPrice, status: f.status,
        color: f.color, bgColor: f.bgColor,
      });
      this.toast.show('Classe mise à jour');
    } else {
      this.classesService.add({
        name: f.name.trim(), subject: f.subject.trim(), level: f.level.trim(),
        teacherId: f.teacherId, roomId: 0, maxCapacity: +f.maxCapacity,
        monthlyPrice: +f.monthlyPrice, status: f.status,
        color: f.color, bgColor: f.bgColor, enrolledStudentIds: [],
      }).subscribe((res: any) => {
        const newId = res?.data?.id ?? res?.id ?? Date.now();
        this.groupsService.groups.update(list => [
          ...list,
          { id: Date.now(), classeId: newId, groupNumber: 1, studentIds: [], maxCapacity: DEFAULT_CAPACITY },
        ]);
        this.toast.show('Classe ajoutée');
        this.showMatiereModal.set(false);
      });
      return;
    }
    this.showMatiereModal.set(false);
  }

  deleteMatiere(c: Classe): void {
    if (confirm(`Supprimer la classe "${c.name}" ?`)) {
      this.classesService.delete(c.id);
      this.toast.show('Classe supprimée', 'info');
    }
  }

  getTeacherName(id: number | null): string {
    if (id === null) return '—';
    const t = this.allTeachers().find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : '—';
  }

  setTab(tabId: string): void { this.activeTab.set(tabId); }
}

function extractValidationError(err: unknown, fallback = 'Erreur lors de l\'enregistrement'): string {
  if (err instanceof HttpErrorResponse && err.status === 422 && err.error?.errors) {
    const messages = Object.values(err.error.errors as Record<string, string[]>).flat();
    return messages.join('. ');
  }
  if (err instanceof HttpErrorResponse && err.error?.message) {
    return err.error.message;
  }
  return fallback;
}
