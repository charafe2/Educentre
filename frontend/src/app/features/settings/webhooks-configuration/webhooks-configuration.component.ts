import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-webhooks-configuration',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="webhooks-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Webhooks Configuration</mat-card-title>
          <mat-card-subtitle>Configure webhook endpoints for integrations</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Webhooks configuration coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .webhooks-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WebhooksConfigurationComponent {}
