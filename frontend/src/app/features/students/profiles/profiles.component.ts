import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="profiles-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Student Profiles</mat-card-title>
          <mat-card-subtitle>Manage student information and profiles</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Student profiles management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .profiles-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilesComponent {}
