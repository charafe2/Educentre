import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'sessions',
    pathMatch: 'full'
  },
  { 
    path: 'sessions', 
    loadComponent: () => import('./sessions/sessions.component').then(m => m.SessionsComponent)
  },
  { 
    path: 'attendance', 
    loadComponent: () => import('./attendance/attendance.component').then(m => m.AttendanceComponent)
  },
  { 
    path: 'schedule', 
    loadComponent: () => import('./schedule/schedule.component').then(m => m.ScheduleComponent)
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
export class PlanningModule { }
