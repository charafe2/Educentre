import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicLevel, SaveAcademicLevelPayload, SuperadminApiService } from '../../superadmin-api.service';

@Component({
  selector: 'app-superadmin-academic-levels',
  imports: [NgClass, FormsModule, DatePipe],
  templateUrl: './superadmin-academic-levels.component.html',
  styleUrl: './superadmin-academic-levels.component.css'
})
export class SuperadminAcademicLevelsComponent implements OnInit {
  private api = inject(SuperadminApiService);

  levels = signal<AcademicLevel[]>([]);
  loading = signal(false);
  pageError = signal('');

  searchQuery = signal('');
  filterStatus = signal<'all' | 'active' | 'inactive'>('all');

  filteredLevels = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.filterStatus();
    return this.levels().filter(level => {
      const matchesSearch = !q || level.name.toLowerCase().includes(q);
      const matchesStatus = s === 'all' || level.status === s;
      return matchesSearch && matchesStatus;
    });
  });

  totalLevels    = computed(() => this.levels().length);
  activeLevels   = computed(() => this.levels().filter(l => l.status === 'active').length);
  assignedLevels = computed(() => this.levels().filter(l => (l.assignedCentresCount ?? 0) > 0).length);

  // Modal state
  showModal = signal(false);
  editingLevelId = signal<number | null>(null);
  formError = signal('');
  saving = signal(false);

  form: SaveAcademicLevelPayload = this.emptyForm();

  ngOnInit(): void {
    void this.loadLevels();
  }

  async loadLevels(): Promise<void> {
    this.loading.set(true);
    this.pageError.set('');
    try {
      this.levels.set(await this.api.getAcademicLevels());
    } catch {
      this.pageError.set('Impossible de charger les niveaux.');
    } finally {
      this.loading.set(false);
    }
  }

  emptyForm(): SaveAcademicLevelPayload {
    return { name: '', status: 'active' };
  }

  openCreate(): void {
    this.editingLevelId.set(null);
    this.form = this.emptyForm();
    this.formError.set('');
    this.showModal.set(true);
  }

  openEdit(level: AcademicLevel): void {
    this.editingLevelId.set(level.id);
    this.form = { name: level.name, status: level.status };
    this.formError.set('');
    this.showModal.set(true);
  }

  async submitSave(): Promise<void> {
    const name = this.form.name.trim();
    const editingId = this.editingLevelId();
    if (!name) {
      this.formError.set('Le nom du niveau est obligatoire.');
      return;
    }
    if (this.levels().some(l => l.name.toLowerCase() === name.toLowerCase() && l.id !== editingId)) {
      this.formError.set('Ce niveau existe déjà.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');
    try {
      const payload: SaveAcademicLevelPayload = { name, status: this.form.status };
      if (editingId) {
        await this.api.updateAcademicLevel(editingId, payload);
      } else {
        await this.api.createAcademicLevel(payload);
      }
      this.showModal.set(false);
      await this.loadLevels();
    } catch {
      this.formError.set('Enregistrement impossible. Vérifiez les champs et réessayez.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteLevel(level: AcademicLevel): Promise<void> {
    if (!confirm(`Supprimer le niveau "${level.name}" ? Cette action est irréversible.`)) return;
    try {
      await this.api.deleteAcademicLevel(level.id);
      this.levels.update(list => list.filter(l => l.id !== level.id));
    } catch {
      this.pageError.set('Suppression impossible : ce niveau est assigné à un centre ou utilisé par une classe/élève.');
    }
  }
}
