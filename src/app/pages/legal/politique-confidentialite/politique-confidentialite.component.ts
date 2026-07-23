import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../legal-layout/legal-layout.component';

@Component({
  selector: 'app-politique-confidentialite',
  standalone: true,
  imports: [LegalLayoutComponent, RouterLink],
  templateUrl: './politique-confidentialite.component.html',
  styleUrl: '../legal-shared.css',
})
export class PolitiqueConfidentialiteComponent {}
