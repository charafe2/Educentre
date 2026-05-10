import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-invoicing',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="invoicing-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Invoicing</mat-card-title>
          <mat-card-subtitle>Generate and manage invoices</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Invoicing management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .invoicing-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoicingComponent {}
