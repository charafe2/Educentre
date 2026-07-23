import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalLayoutComponent } from '../legal-layout/legal-layout.component';

@Component({
  selector: 'app-conditions-generales',
  standalone: true,
  imports: [LegalLayoutComponent, RouterLink],
  templateUrl: './conditions-generales.component.html',
  styleUrl: '../legal-shared.css',
})
export class ConditionsGeneralesComponent {}
