import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CoreModule } from '../../core/core.module';

const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'profiles',
    pathMatch: 'full'
  },
  { 
    path: 'profiles', 
    loadComponent: () => import('./profiles/profiles.component').then(m => m.ProfilesComponent)
  },
  { 
    path: 'enrollment', 
    loadComponent: () => import('./enrollment/enrollment.component').then(m => m.EnrollmentComponent)
  },
  { 
    path: 'grades', 
    loadComponent: () => import('./grades/grades.component').then(m => m.GradesComponent)
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
export class StudentsModule { }
