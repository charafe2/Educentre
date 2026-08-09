import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PackagePlan, SuperadminApiService } from '../../superadmin-api.service';

const EMPTY_PACKAGE: PackagePlan = {
  id: 0,
  uuid: '',
  name: '',
  monthlyPrice: 0,
  usersLimit: 1,
  studentsLimit: 1,
  storageGb: 1,
  supportLevel: 'Standard',
  status: 'draft',
  features: [],
};

@Component({
  selector: 'app-superadmin-packages',
  imports: [FormsModule],
  templateUrl: './superadmin-packages.component.html',
  styleUrl: './superadmin-packages.component.css'
})
export class SuperadminPackagesComponent implements OnInit {
  private api = inject(SuperadminApiService);

  packages = signal<PackagePlan[]>([]);
  selectedId = signal(0);
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  featureDraft = '';

  selectedPackage = computed(() => this.packages().find(plan => plan.id === this.selectedId()) ?? this.packages()[0] ?? EMPTY_PACKAGE);
  activePackages = computed(() => this.packages().filter(plan => plan.status === 'active').length);
  projectedRevenue = computed(() => this.packages().filter(plan => plan.status === 'active').reduce((sum, plan) => sum + plan.monthlyPrice, 0));

  ngOnInit(): void {
    void this.loadPackages();
  }

  async loadPackages(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const plans = await this.api.getPackages();
      this.packages.set(plans);
      this.selectedId.set(plans[1]?.id ?? plans[0]?.id ?? 0);
    } catch {
      this.error.set('Impossible de charger les packages.');
    } finally {
      this.loading.set(false);
    }
  }

  selectPackage(id: number) {
    this.selectedId.set(id);
    this.featureDraft = '';
  }

  updateSelected<K extends keyof PackagePlan>(key: K, value: PackagePlan[K]) {
    const id = this.selectedPackage().id;
    this.packages.update(list => list.map(plan => plan.id === id ? { ...plan, [key]: value } : plan));
  }

  addFeature() {
    const value = this.featureDraft.trim();
    if (!value) return;
    const plan = this.selectedPackage();
    this.updateSelected('features', [...plan.features, value]);
    this.featureDraft = '';
  }

  removeFeature(feature: string) {
    const plan = this.selectedPackage();
    this.updateSelected('features', plan.features.filter(item => item !== feature));
  }

  async saveSelected(): Promise<void> {
    const plan = this.selectedPackage();
    if (!plan.id || !plan.name.trim()) return;

    this.saving.set(true);
    this.error.set('');
    try {
      const { id, uuid, ...payload } = plan;
      const updated = await this.api.updatePackage(id, payload);
      this.packages.update(list => list.map(item => item.id === id ? updated : item));
    } catch {
      this.error.set('Impossible d’enregistrer ce package.');
    } finally {
      this.saving.set(false);
    }
  }

  async duplicateSelected(): Promise<void> {
    const plan = this.selectedPackage();
    if (!plan.id) return;

    this.saving.set(true);
    this.error.set('');
    try {
      const created = await this.api.createPackage({
        name: `${plan.name} copie`,
        monthlyPrice: plan.monthlyPrice,
        usersLimit: plan.usersLimit,
        studentsLimit: plan.studentsLimit,
        storageGb: plan.storageGb,
        supportLevel: plan.supportLevel,
        status: 'draft',
        features: [...plan.features],
      });
      this.packages.update(list => [...list, created]);
      this.selectedId.set(created.id);
    } catch {
      this.error.set('Impossible de dupliquer ce package.');
    } finally {
      this.saving.set(false);
    }
  }

  async archiveSelected(): Promise<void> {
    const current = this.selectedPackage();
    this.updateSelected('status', current.status === 'archived' ? 'draft' : 'archived');
    await this.saveSelected();
  }
}
