import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../legal-layout/legal-layout.component';

@Component({
  selector: 'app-politique-cookies',
  standalone: true,
  imports: [LegalLayoutComponent, RouterLink],
  templateUrl: './politique-cookies.component.html',
  styleUrl: '../legal-shared.css',
})
export class PolitiqueCookiesComponent {}
