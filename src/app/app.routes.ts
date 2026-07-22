import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { superadminAuthGuard } from './superadmin/superadmin-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/hero/hero.component').then(m => m.HeroComponent),
    pathMatch: 'full',
  },

  {
    path: 'login',
    loadComponent: () => import('./auth/pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },

  {
    path: '',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'revue-mensuelle', loadComponent: () => import('./pages/monthly-review/monthly-review.component').then(m => m.MonthlyReviewComponent) },
      { path: 'etudiants', loadComponent: () => import('./pages/etudiants/etudiants.component').then(m => m.EtudiantsComponent) },
      { path: 'groupes', loadComponent: () => import('./pages/groupes/groupes.component').then(m => m.GroupesComponent) },
      { path: 'professeurs', loadComponent: () => import('./pages/professeurs/professeurs.component').then(m => m.ProfesseursComponent) },
      { path: 'finances', loadComponent: () => import('./pages/finances/finances.component').then(m => m.FinancesComponent) },
      { path: 'calendrier', loadComponent: () => import('./pages/calendrier/calendrier.component').then(m => m.CalendrierComponent) },
      { path: 'analytiques', loadComponent: () => import('./pages/analytiques/analytiques.component').then(m => m.AnalytiquesComponent) },
      { path: 'documents', loadComponent: () => import('./pages/documents/documents.component').then(m => m.DocumentsComponent) },
      { path: 'parametres', loadComponent: () => import('./pages/parametres/parametres.component').then(m => m.ParametresComponent) },
    ],
  },

  {
    path: 'superadmin',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./superadmin/pages/login/superadmin-login.component').then(m => m.SuperadminLoginComponent),
      },
      {
        path: '',
        loadComponent: () => import('./superadmin/layout/superadmin-layout.component').then(m => m.SuperadminLayoutComponent),
        canActivate: [superadminAuthGuard],
        children: [
          { path: 'dashboard', loadComponent: () => import('./superadmin/pages/overview/superadmin-overview.component').then(m => m.SuperadminOverviewComponent) },
          { path: 'clients',   loadComponent: () => import('./superadmin/pages/clients/superadmin-clients.component').then(m => m.SuperadminClientsComponent) },
          { path: 'packages',  loadComponent: () => import('./superadmin/pages/packages/superadmin-packages.component').then(m => m.SuperadminPackagesComponent) },
          { path: 'accounts',  loadComponent: () => import('./superadmin/pages/accounts/superadmin-accounts.component').then(m => m.SuperadminAccountsComponent) },
          { path: 'invoices',  loadComponent: () => import('./superadmin/pages/invoices/superadmin-invoices.component').then(m => m.SuperadminInvoicesComponent) },
        ],
      },
    ],
  },
];
