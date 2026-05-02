import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'subscriptions',
    pathMatch: 'full'
  },
  { 
    path: 'subscriptions', 
    loadComponent: () => import('./subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent)
  },
  { 
    path: 'invoicing', 
    loadComponent: () => import('./invoicing/invoicing.component').then(m => m.InvoicingComponent)
  },
  { 
    path: 'payments', 
    loadComponent: () => import('./payments/payments.component').then(m => m.PaymentsComponent)
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
export class FinanceModule { }
