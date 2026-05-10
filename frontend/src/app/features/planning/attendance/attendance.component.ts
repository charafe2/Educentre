import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="attendance-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Attendance Management</mat-card-title>
          <mat-card-subtitle>Track student attendance and check-ins</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Attendance management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .attendance-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceComponent {}
