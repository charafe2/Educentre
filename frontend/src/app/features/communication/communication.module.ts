import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'sms-email-templates',
    pathMatch: 'full'
  },
  { 
    path: 'sms-email-templates', 
    loadComponent: () => import('./sms-email-templates/sms-email-templates.component').then(m => m.SmsEmailTemplatesComponent)
  },
  { 
    path: 'logs', 
    loadComponent: () => import('./logs/logs.component').then(m => m.LogsComponent)
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
export class CommunicationModule { }
