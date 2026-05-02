import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-sms-email-templates',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="templates-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>SMS & Email Templates</mat-card-title>
          <mat-card-subtitle>Manage communication templates</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Template management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .templates-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmsEmailTemplatesComponent {}
