import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-grades',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="grades-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Student Grades</mat-card-title>
          <mat-card-subtitle>Manage student grades and assessments</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p>Student grades management coming soon...</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .grades-container {
      padding: 24px;
    }
    mat-card {
      margin-bottom: 16px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradesComponent {}
