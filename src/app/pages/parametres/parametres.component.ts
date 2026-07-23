import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CentreService } from '../../services/centre.service';
import { StudentsService } from '../../services/students.service';
import { TeachersService } from '../../services/teachers.service';
import { ClassesService } from '../../services/classes.service';
import { SubjectsService } from '../../services/subjects.service';
import { AcademicLevelsService } from '../../services/academic-levels.service';
import { GroupsService, DEFAULT_CAPACITY } from '../../services/groups.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../auth/auth.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { ReceiptPreviewComponent } from '../../components/receipt-preview/receipt-preview.component';
import { Classe } from '../../models/classe.model';
import { ReceiptCustomizationService, ReceiptCustomizationSettings } from '../../services/receipt-customization.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';

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
  imports: [NgClass, FormsModule, ModalComponent, ReceiptPreviewComponent, TranslatePipe],
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css'
})
export class ParametresComponent implements OnInit {
  private centreService = inject(CentreService);
  private studentsService = inject(StudentsService);
  private teachersService = inject(TeachersService);
  private classesService = inject(ClassesService);
  private subjectsService = inject(SubjectsService);
  private academicLevelsService = inject(AcademicLevelsService);
  private groupsService = inject(GroupsService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private receiptCustomization = inject(ReceiptCustomizationService);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  activeTab = signal('centre');

  // `label` holds a translation key, resolved in the template via `| t`.
  tabs = [
    { id: 'centre', label: 'settings.tabCentre', icon: 'fa-solid fa-building' },
    { id: 'receipt', label: 'settings.tabReceipt', icon: 'fa-solid fa-receipt' },
    { id: 'matieres', label: 'settings.tabMatieres', icon: 'fa-solid fa-book-open' },
    { id: 'users', label: 'settings.tabUsers', icon: 'fa-solid fa-users' },
    { id: 'securite', label: 'settings.tabSecurity', icon: 'fa-solid fa-lock' },
    { id: 'subscription', label: 'settings.tabSubscription', icon: 'fa-solid fa-credit-card' },
    { id: 'notifications', label: 'settings.tabNotifications', icon: 'fa-solid fa-bell' },
  ];

  centreForm = { ...this.centreService.centreInfo() };
  saving = signal(false);
  receiptSettings = this.receiptCustomization.settings;
  receiptForm: ReceiptCustomizationSettings = { ...this.receiptCustomization.settings() };

  centreTypes = ['Soutien scolaire', 'Langue', 'Informatique', 'Artistique'];

  users = signal<User[]>([
    { id: 1, name: 'Ahmed Berrada', email: 'a.berrada@centre.ma', role: this.roleLabel('admin'), roleType: 'admin', lastLogin: '08/05/2025' },
    { id: 2, name: 'Rachid Mansouri', email: 'r.mansouri@centre.ma', role: this.roleLabel('teacher'), roleType: 'teacher', lastLogin: '07/05/2025' },
    { id: 3, name: 'Samira Bouazza', email: 's.bouazza@centre.ma', role: this.roleLabel('teacher'), roleType: 'teacher', lastLogin: '08/05/2025' },
    { id: 4, name: 'Khadija Alami', email: 'k.alami@centre.ma', role: this.roleLabel('manager'), roleType: 'manager', lastLogin: '06/05/2025' },
    { id: 5, name: 'Younes Tazi', email: 'y.tazi@centre.ma', role: this.roleLabel('accountant'), roleType: 'accountant', lastLogin: '05/05/2025' },
  ]);

  showUserModal = signal(false);
  userForm = { name: '', email: '', role: this.roleLabel('teacher'), roleType: 'teacher' as User['roleType'] };

  roleLabel(type: User['roleType']): string {
    const key = {
      admin: 'settings.roleAdmin',
      teacher: 'settings.roleTeacher',
      manager: 'settings.roleManager',
      accountant: 'settings.roleAccountant',
    }[type];
    return this.t(key);
  }

  onUserRoleTypeChange(roleType: User['roleType']): void {
    this.userForm.roleType = roleType;
    this.userForm.role = this.roleLabel(roleType);
  }

  // `label` holds a translation key, resolved in the template via `| t`.
  subscriptionFeatures = [
    { label: 'settings.featureUnlimitedStudents', included: true },
    { label: 'settings.featureUnlimitedTeachers', included: true },
    { label: 'settings.featureAutoWhatsapp', included: true },
    { label: 'settings.featureReportsAnalytics', included: true },
    { label: 'settings.featureCloudBackup', included: true },
    { label: 'settings.featurePrioritySupport', included: false },
    { label: 'settings.featureCustomApi', included: false },
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
      this.toast.show(this.t('settings.toastCentreSaved'));
    } catch (err: unknown) {
      const message = extractValidationError(err, this.t('settings.saveError'));
      this.toast.show(message);
    } finally {
      this.saving.set(false);
    }
  }

  resetCentreForm(): void {
    this.centreForm = { ...this.centreService.centreInfo() };
  }

  getReceiptPreviewData() {
    return this.receiptCustomization.sampleData(this.receiptForm);
  }

  onReceiptLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.receiptForm.logoDataUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  clearReceiptLogo(): void {
    this.receiptForm.logoDataUrl = '';
  }

  saveReceiptSettings(): void {
    this.receiptCustomization.save({ ...this.receiptForm });
    this.receiptForm = { ...this.receiptCustomization.settings() };
    this.toast.show(this.t('settings.toastReceiptSaved'));
  }

  resetReceiptSettings(): void {
    this.receiptForm = this.receiptCustomization.reset();
    this.toast.show(this.t('settings.toastReceiptReset'), 'info');
  }

  openAddUser(): void {
    this.userForm = { name: '', email: '', role: this.roleLabel('teacher'), roleType: 'teacher' };
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
      lastLogin: '-',
    }]);
    this.toast.show(this.t('settings.toastUserAdded'));
    this.showUserModal.set(false);
  }

  deleteUser(u: User): void {
    if (confirm(this.t('settings.confirmDeleteUser', { name: u.name }))) {
      this.users.update(list => list.filter(x => x.id !== u.id));
      this.toast.show(this.t('settings.toastUserDeleted'), 'info');
    }
  }

  saveNotifications(): void {
    this.toast.show(this.t('settings.toastNotifSaved'));
  }

  // Security - password change
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
      this.passwordError.set(this.t('settings.allFieldsRequired'));
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
    this.toast.show(this.t('settings.toastPasswordChanged'));
  }

  // ── Matières ──────────────────────────────────────────────
  // Subjects are managed by the Super Admin and assigned per center — this
  // page only lets the owner/manager pick from what's already assigned.
  allTeachers = this.teachersService.teachers;
  allSubjects = this.subjectsService.subjects;
  allLevels = this.academicLevelsService.levels;

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
    maxCapacity: null as number | null, monthlyPrice: null as number | null,
    status: 'active' as 'active' | 'inactive',
    color: '#1d4ed8', bgColor: '#dbeafe',
  };

  // Aucune valeur métier n'est présélectionnée (professeur, capacité, prix) :
  // c'est au propriétaire/gérant de les choisir lui-même pour chaque classe.
  openAddMatiere(): void {
    this.editingMatiere.set(null);
    this.matiereForm = {
      name: '', subject: '', level: '', teacherId: null,
      maxCapacity: null, monthlyPrice: null,
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
    if (!f.name.trim() || !f.subject.trim() || !f.level.trim() || !f.teacherId
      || !f.maxCapacity || !f.monthlyPrice) {
      this.toast.show(this.t('settings.toastRequiredFields'));
      return;
    }
    const maxCapacity = +f.maxCapacity;
    const monthlyPrice = +f.monthlyPrice;
    const ec = this.editingMatiere();
    if (ec) {
      this.classesService.update(ec.id, {
        name: f.name.trim(), subject: f.subject.trim(), level: f.level.trim(),
        teacherId: f.teacherId, maxCapacity,
        monthlyPrice, status: f.status,
        color: f.color, bgColor: f.bgColor,
      });
      this.toast.show(this.t('settings.toastClassUpdated'));
    } else {
      this.classesService.add({
        name: f.name.trim(), subject: f.subject.trim(), level: f.level.trim(),
        teacherId: f.teacherId, roomId: null, maxCapacity,
        monthlyPrice, status: f.status,
        color: f.color, bgColor: f.bgColor, enrolledStudentIds: [],
      }).subscribe((res: any) => {
        const newId = res?.data?.id ?? res?.id ?? Date.now();
        this.groupsService.groups.update(list => [
          ...list,
          { id: Date.now(), classeId: newId, groupNumber: 1, studentIds: [], maxCapacity: DEFAULT_CAPACITY },
        ]);
        this.toast.show(this.t('settings.toastClassAdded'));
        this.showMatiereModal.set(false);
      });
      return;
    }
    this.showMatiereModal.set(false);
  }

  deleteMatiere(c: Classe): void {
    if (confirm(this.t('settings.confirmDeleteClass', { name: c.name }))) {
      this.classesService.delete(c.id);
      this.toast.show(this.t('settings.toastClassDeleted'), 'info');
    }
  }

  getTeacherName(id: number | null): string {
    if (id === null) return '-';
    const t = this.allTeachers().find(t => t.id === id);
    return t ? `${t.firstName} ${t.lastName}` : '-';
  }

  setTab(tabId: string): void { this.activeTab.set(tabId); }
}

function extractValidationError(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse && err.status === 422 && err.error?.errors) {
    const messages = Object.values(err.error.errors as Record<string, string[]>).flat();
    return messages.join('. ');
  }
  if (err instanceof HttpErrorResponse && err.error?.message) {
    return err.error.message;
  }
  return fallback;
}
