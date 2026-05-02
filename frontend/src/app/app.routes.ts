import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { TenantGuard } from './core/guards/tenant.guard';
import { RoleGuard } from './core/guards/role.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  // Public routes (no authentication required)
  {
    path: '',
    loadChildren: () => import('./features/public/public.module').then(m => m.PublicModule)
  },

  // Direct login route
  {
    path: 'login',
    canActivate: [NoAuthGuard],
    loadComponent: () => import('./core/components/login/login.component').then(m => m.LoginComponent)
  },

  // Basic dashboard route (no tenant required)
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },

  // Auth routes (redirect if already authenticated)
  {
    path: 'auth',
    canActivate: [NoAuthGuard],
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },

  // Tenant-scoped auth routes (for direct tenant login)
  {
    path: ':tenant/auth',
    canActivate: [TenantGuard, NoAuthGuard],
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },

  // Tenant-based routes (main SaaS app with layout shell)
  {
    path: ':tenant',
    canActivate: [TenantGuard, AuthGuard],
    loadComponent: () => import('./features/layout/components/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'students',
        loadChildren: () => import('./features/students/students.module').then(m => m.StudentsModule)
      },
      {
        path: 'planning',
        loadChildren: () => import('./features/planning/planning.module').then(m => m.PlanningModule)
      },
      {
        path: 'finance',
        loadChildren: () => import('./features/finance/finance.module').then(m => m.FinanceModule)
      },
      {
        path: 'communication',
        loadChildren: () => import('./features/communication/communication.module').then(m => m.CommunicationModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.module').then(m => m.SettingsModule),
        canActivate: [RoleGuard],
        data: {
          roles: ['SuperAdmin', 'SchoolAdmin'],
          redirectTo: 'dashboard'
        }
      }
    ]
  },

  // Fallback routes
  {
    path: 'invalid-tenant',
    loadComponent: () => import('./core/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./core/components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
