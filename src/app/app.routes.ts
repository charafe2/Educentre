import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { parentAuthGuard } from './parent/parent-auth.guard';

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
  {
    path: 'parent',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./parent/pages/login/parent-login.component').then(m => m.ParentLoginComponent),
      },
      {
        path: '',
        loadComponent: () =>
          import('./parent/layout/parent-layout.component').then(m => m.ParentLayoutComponent),
        canActivate: [parentAuthGuard],
        children: [
          {
            path: 'accueil',
            loadComponent: () =>
              import('./parent/pages/accueil/parent-accueil.component').then(m => m.ParentAccueilComponent),
          },
          {
            path: 'cours',
            loadComponent: () =>
              import('./parent/pages/cours/parent-cours.component').then(m => m.ParentCoursComponent),
          },
          {
            path: 'paiements',
            loadComponent: () =>
              import('./parent/pages/paiements/parent-paiements.component').then(m => m.ParentPaiementsComponent),
          },
          {
            path: 'presence',
            loadComponent: () =>
              import('./parent/pages/presence/parent-presence.component').then(m => m.ParentPresenceComponent),
          },
          {
            path: 'notes',
            loadComponent: () =>
              import('./parent/pages/notes/parent-notes.component').then(m => m.ParentNotesComponent),
          },
        ],
      },
    ],
  },
];
