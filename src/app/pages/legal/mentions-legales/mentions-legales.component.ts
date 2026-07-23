import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../legal-layout/legal-layout.component';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [LegalLayoutComponent, RouterLink],
  templateUrl: './mentions-legales.component.html',
  styleUrl: '../legal-shared.css',
})
export class MentionsLegalesComponent {}
