import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { permissionGuard } from './auth/permission.guard';
import { superadminAuthGuard } from './superadmin/superadmin-auth.guard';
import { superadminGuestGuard } from './superadmin/superadmin-guest.guard';

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

  // Public SEO marketing landing pages (Moroccan French). Kept above the
  // authenticated layout route so they resolve as standalone public pages.
  {
    path: 'logiciel-gestion-centre-soutien-scolaire',
    loadComponent: () => import('./pages/marketing/centre-soutien-scolaire/centre-soutien-scolaire.component').then(m => m.CentreSoutienScolaireComponent),
  },
  {
    path: 'logiciel-gestion-ecole',
    loadComponent: () => import('./pages/marketing/gestion-ecole/gestion-ecole.component').then(m => m.GestionEcoleComponent),
  },
  {
    path: 'logiciel-gestion-centre-de-langues',
    loadComponent: () => import('./pages/marketing/centre-de-langues/centre-de-langues.component').then(m => m.CentreDeLanguesComponent),
  },
  {
    path: 'fonctionnalites/gestion-eleves',
    loadComponent: () => import('./pages/marketing/gestion-eleves/gestion-eleves.component').then(m => m.GestionElevesComponent),
  },
  {
    path: 'meilleur-logiciel-gestion-centre-maroc',
    loadComponent: () => import('./pages/marketing/meilleur-logiciel/meilleur-logiciel.component').then(m => m.MeilleurLogicielComponent),
  },
  {
    path: 'moujtahid-vs-tayssir-academie',
    loadComponent: () => import('./pages/marketing/vs-tayssir/vs-tayssir.component').then(m => m.VsTayssirComponent),
  },
  {
    path: 'moujtahid-vs-centerplus',
    loadComponent: () => import('./pages/marketing/vs-centerplus/vs-centerplus.component').then(m => m.VsCenterPlusComponent),
  },
  {
    path: 'blog',
    loadComponent: () => import('./pages/marketing/blog/blog.component').then(m => m.BlogComponent),
  },

  {
    path: 'politique-de-confidentialite',
    loadComponent: () => import('./pages/legal/politique-confidentialite/politique-confidentialite.component').then(m => m.PolitiqueConfidentialiteComponent),
  },
  {
    path: 'conditions-generales-utilisation',
    loadComponent: () => import('./pages/legal/conditions-generales/conditions-generales.component').then(m => m.ConditionsGeneralesComponent),
  },
  {
    path: 'politique-de-cookies',
    loadComponent: () => import('./pages/legal/politique-cookies/politique-cookies.component').then(m => m.PolitiqueCookiesComponent),
  },
  {
    path: 'mentions-legales',
    loadComponent: () => import('./pages/legal/mentions-legales/mentions-legales.component').then(m => m.MentionsLegalesComponent),
  },

  {
    path: '',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      {
        path: 'revue-mensuelle', canActivate: [permissionGuard], data: { permKey: 'revue-mensuelle' },
        loadComponent: () => import('./pages/monthly-review/monthly-review.component').then(m => m.MonthlyReviewComponent),
      },
      {
        path: 'etudiants', canActivate: [permissionGuard], data: { permKey: 'etudiants' },
        loadComponent: () => import('./pages/etudiants/etudiants.component').then(m => m.EtudiantsComponent),
      },
      {
        path: 'groupes', canActivate: [permissionGuard], data: { permKey: 'groupes' },
        loadComponent: () => import('./pages/groupes/groupes.component').then(m => m.GroupesComponent),
      },
      {
        path: 'professeurs', canActivate: [permissionGuard], data: { permKey: 'professeurs' },
        loadComponent: () => import('./pages/professeurs/professeurs.component').then(m => m.ProfesseursComponent),
      },
      {
        path: 'finances', canActivate: [permissionGuard], data: { permKey: 'finances' },
        loadComponent: () => import('./pages/finances/finances.component').then(m => m.FinancesComponent),
      },
      {
        path: 'calendrier', canActivate: [permissionGuard], data: { permKey: 'calendrier' },
        loadComponent: () => import('./pages/calendrier/calendrier.component').then(m => m.CalendrierComponent),
      },
      {
        path: 'analytiques', canActivate: [permissionGuard], data: { permKey: 'analytiques' },
        loadComponent: () => import('./pages/analytiques/analytiques.component').then(m => m.AnalytiquesComponent),
      },
      {
        path: 'documents', canActivate: [permissionGuard], data: { permKey: 'documents' },
        loadComponent: () => import('./pages/documents/documents.component').then(m => m.DocumentsComponent),
      },
      {
        path: 'parametres', canActivate: [permissionGuard], data: { permKey: 'parametres' },
        loadComponent: () => import('./pages/parametres/parametres.component').then(m => m.ParametresComponent),
      },
    ],
  },

  {
    path: 'superadmin',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./superadmin/pages/login/superadmin-login.component').then(m => m.SuperadminLoginComponent),
        canActivate: [superadminGuestGuard],
      },
      {
        path: '',
        loadComponent: () => import('./superadmin/layout/superadmin-layout.component').then(m => m.SuperadminLayoutComponent),
        canActivate: [superadminAuthGuard],
        children: [
          { path: 'dashboard', loadComponent: () => import('./superadmin/pages/overview/superadmin-overview.component').then(m => m.SuperadminOverviewComponent) },
          { path: 'clients',   loadComponent: () => import('./superadmin/pages/clients/superadmin-clients.component').then(m => m.SuperadminClientsComponent) },
          { path: 'subjects',  loadComponent: () => import('./superadmin/pages/subjects/superadmin-subjects.component').then(m => m.SuperadminSubjectsComponent) },
          { path: 'academic-levels', loadComponent: () => import('./superadmin/pages/academic-levels/superadmin-academic-levels.component').then(m => m.SuperadminAcademicLevelsComponent) },
          { path: 'packages',  loadComponent: () => import('./superadmin/pages/packages/superadmin-packages.component').then(m => m.SuperadminPackagesComponent) },
          { path: 'accounts',  loadComponent: () => import('./superadmin/pages/accounts/superadmin-accounts.component').then(m => m.SuperadminAccountsComponent) },
          { path: 'invoices',  loadComponent: () => import('./superadmin/pages/invoices/superadmin-invoices.component').then(m => m.SuperadminInvoicesComponent) },
        ],
      },
    ],
  },
];
