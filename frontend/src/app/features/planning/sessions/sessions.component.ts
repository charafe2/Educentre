import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="sessions-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Teaching Sessions</mat-card-title>
          <mat-card-subtitle>Manage teaching sessions and schedules</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Teaching sessions management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .sessions-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SessionsComponent {}
