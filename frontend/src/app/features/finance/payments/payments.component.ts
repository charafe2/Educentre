import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="payments-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Payment Management</mat-card-title>
          <mat-card-subtitle>Process and track payments</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Payment management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .payments-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentsComponent {}
