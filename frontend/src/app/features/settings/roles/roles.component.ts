import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="roles-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Role Management</mat-card-title>
          <mat-card-subtitle>Manage user roles and permissions</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Role management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .roles-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolesComponent {}
