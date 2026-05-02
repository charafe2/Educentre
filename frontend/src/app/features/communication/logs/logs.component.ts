import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="logs-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Communication Logs</mat-card-title>
          <mat-card-subtitle>View SMS and email communication history</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Communication logs coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .logs-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogsComponent {}
