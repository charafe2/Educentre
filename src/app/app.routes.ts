import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'etudiants',
    loadComponent: () =>
      import('./pages/etudiants/etudiants.component').then(m => m.EtudiantsComponent),
  },
  {
    path: 'professeurs',
    loadComponent: () =>
      import('./pages/professeurs/professeurs.component').then(m => m.ProfesseursComponent),
  },
  {
    path: 'finances',
    loadComponent: () =>
      import('./pages/finances/finances.component').then(m => m.FinancesComponent),
  },
  {
    path: 'calendrier',
    loadComponent: () =>
      import('./pages/calendrier/calendrier.component').then(m => m.CalendrierComponent),
  },
  {
    path: 'analytiques',
    loadComponent: () =>
      import('./pages/analytiques/analytiques.component').then(m => m.AnalytiquesComponent),
  },
  {
    path: 'documents',
    loadComponent: () =>
      import('./pages/documents/documents.component').then(m => m.DocumentsComponent),
  },
  {
    path: 'parametres',
    loadComponent: () =>
      import('./pages/parametres/parametres.component').then(m => m.ParametresComponent),
  },
];
