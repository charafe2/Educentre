import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="subscriptions-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Subscription Management</mat-card-title>
          <mat-card-subtitle>Manage subscription plans and billing</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Subscription management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .subscriptions-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionsComponent {}
