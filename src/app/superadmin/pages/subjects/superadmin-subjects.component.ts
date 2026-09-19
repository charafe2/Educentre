import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaveSubjectPayload, Subject, SuperadminApiService } from '../../superadmin-api.service';

type SubjectFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-superadmin-subjects',
  imports: [FormsModule, DatePipe],
  templateUrl: './superadmin-subjects.component.html',
  styleUrl: './superadmin-subjects.component.css'
})
export class SuperadminSubjectsComponent implements OnInit {
  private api = inject(SuperadminApiService);

  subjects = signal<Subject[]>([]);
  loading = signal(false);
  pageError = signal('');

  searchQuery = signal('');
  filterStatus = signal<SubjectFilter>('all');

  statusFilters: { key: SubjectFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' },
    { key: 'active', label: 'Actives' },
    { key: 'inactive', label: 'Inactives' },
  ];

  filteredSubjects = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.filterStatus();
    return this.subjects().filter(subject => {
      const matchesSearch = !q || subject.name.toLowerCase().includes(q);
      const matchesStatus = s === 'all' || subject.status === s;
      return matchesSearch && matchesStatus;
    });
  });

  totalSubjects  = computed(() => this.subjects().length);
  activeSubjects = computed(() => this.subjects().filter(s => s.status === 'active').length);
  assignedSubjects = computed(() => this.subjects().filter(s => (s.assignedCentresCount ?? 0) > 0).length);

  // Modal state
  showModal = signal(false);
  editingSubjectId = signal<number | null>(null);
  formError = signal('');
  saving = signal(false);

  form: SaveSubjectPayload = this.emptyForm();

  ngOnInit(): void {
    void this.loadSubjects();
  }

  async loadSubjects(): Promise<void> {
    this.loading.set(true);
    this.pageError.set('');
    try {
      this.subjects.set(await this.api.getSubjects());
    } catch {
      this.pageError.set('Impossible de charger les matières.');
    } finally {
      this.loading.set(false);
    }
  }

  emptyForm(): SaveSubjectPayload {
    return { name: '', status: 'active' };
  }

  openCreate(): void {
    this.editingSubjectId.set(null);
    this.form = this.emptyForm();
    this.formError.set('');
    this.showModal.set(true);
  }

  openEdit(subject: Subject): void {
    this.editingSubjectId.set(subject.id);
    this.form = { name: subject.name, status: subject.status };
    this.formError.set('');
    this.showModal.set(true);
  }

  async submitSave(): Promise<void> {
    const name = this.form.name.trim();
    const editingId = this.editingSubjectId();
    if (!name) {
      this.formError.set('Le nom de la matière est obligatoire.');
      return;
    }
    if (this.subjects().some(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== editingId)) {
      this.formError.set('Cette matière existe déjà.');
      return;
    }

    this.saving.set(true);
    this.formError.set('');
    try {
      const payload: SaveSubjectPayload = { name, status: this.form.status };
      if (editingId) {
        await this.api.updateSubject(editingId, payload);
      } else {
        await this.api.createSubject(payload);
      }
      this.showModal.set(false);
      await this.loadSubjects();
    } catch {
      this.formError.set('Enregistrement impossible. Vérifiez les champs et réessayez.');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteSubject(subject: Subject): Promise<void> {
    if (!confirm(`Supprimer la matière "${subject.name}" ? Cette action est irréversible.`)) return;
    try {
      await this.api.deleteSubject(subject.id);
      this.subjects.update(list => list.filter(s => s.id !== subject.id));
    } catch {
      this.pageError.set('Suppression impossible : cette matière est assignée à un centre ou utilisée par une classe.');
    }
  }
}
