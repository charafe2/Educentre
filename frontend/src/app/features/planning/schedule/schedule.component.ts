import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="schedule-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Schedule Management</mat-card-title>
          <mat-card-subtitle>Manage class schedules and timetables</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Schedule management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .schedule-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduleComponent {}
