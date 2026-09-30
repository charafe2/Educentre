import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { guestGuard } from './auth/guest.guard';
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
    canActivate: [guestGuard],
  },
  {
    path: 'select-centre',
    loadComponent: () => import('./auth/pages/select-centre/select-centre.component').then(m => m.SelectCentreComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [guestGuard],
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

  // Old addresses (the retired sidebar UI and the /v2 preview) still land
  // somewhere sensible, so bookmarks and shared links keep working.
  { path: 'v2', redirectTo: 'accueil', pathMatch: 'full' },
  { path: 'v2/:page', redirectTo: ':page' }, // prefix match keeps the rest, e.g. v2/etudiants/nouveau
  { path: 'dashboard', redirectTo: 'accueil' },
  { path: 'finances', redirectTo: 'caisse' },
  { path: 'professeurs', redirectTo: 'enseignants' },
  { path: 'ajouter-classe', redirectTo: 'etudiants/nouveau' },
  { path: 'revue-mensuelle', redirectTo: 'accueil' },
  { path: 'calendrier', redirectTo: 'groupes' },
  { path: 'notifications', redirectTo: 'accueil' },
  { path: 'analytiques', redirectTo: 'accueil' },
  { path: 'documents', redirectTo: 'accueil' },

  {
    path: '',
    loadComponent: () => import('./layout/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: 'accueil', loadComponent: () => import('./pages/accueil/accueil.component').then(m => m.AccueilComponent) },
      {
        path: 'groupes', canActivate: [permissionGuard], data: { permKey: 'groupes' },
        loadComponent: () => import('./pages/groupes-v2/groupes-v2.component').then(m => m.GroupesV2Component),
      },
      {
        path: 'caisse', canActivate: [permissionGuard], data: { permKey: 'finances' },
        loadComponent: () => import('./pages/caisse/caisse.component').then(m => m.CaisseComponent),
      },
      {
        path: 'enseignants', canActivate: [permissionGuard], data: { permKey: 'professeurs' },
        loadComponent: () => import('./pages/enseignants/enseignants.component').then(m => m.EnseignantsComponent),
      },
      {
        path: 'etudiants', canActivate: [permissionGuard], data: { permKey: 'etudiants' },
        loadComponent: () => import('./pages/etudiants-liste/etudiants-liste.component').then(m => m.EtudiantsListeComponent),
      },
      {
        path: 'etudiants/nouveau', canActivate: [permissionGuard], data: { permKey: 'etudiants' },
        loadComponent: () => import('./pages/ajouter-eleve-v2/ajouter-eleve-v2.component').then(m => m.AjouterEleveV2Component),
      },
      {
        path: 'parametres', canActivate: [permissionGuard], data: { permKey: 'parametres' },
        loadComponent: () => import('./pages/parametres-v2/parametres-v2.component').then(m => m.ParametresV2Component),
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
          { path: 'tickets',   loadComponent: () => import('./superadmin/pages/tickets/tickets.component').then(m => m.TicketsComponent) },
          { path: 'audit-log', loadComponent: () => import('./superadmin/pages/audit-log/superadmin-audit-log.component').then(m => m.SuperadminAuditLogComponent) },
        ],
      },
    ],
  },
];
