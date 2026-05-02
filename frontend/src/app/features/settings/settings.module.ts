import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'webhooks-configuration',
    pathMatch: 'full'
  },
  { 
    path: 'webhooks-configuration', 
    loadComponent: () => import('./webhooks-configuration/webhooks-configuration.component').then(m => m.WebhooksConfigurationComponent)
  },
  { 
    path: 'roles', 
    loadComponent: () => import('./roles/roles.component').then(m => m.RolesComponent)
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SharedModule,
    CoreModule,
    RouterModule.forChild(routes)
  ]
})
export class SettingsModule { }
