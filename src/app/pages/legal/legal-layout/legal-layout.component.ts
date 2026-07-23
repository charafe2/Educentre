import { Component, Input } from '@angular/core';
import { SiteNavbarComponent } from '../site-navbar/site-navbar.component';
import { SiteFooterComponent } from '../site-footer/site-footer.component';

@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [SiteNavbarComponent, SiteFooterComponent],
  templateUrl: './legal-layout.component.html',
  styleUrl: '../legal-shared.css',
})
export class LegalLayoutComponent {
  @Input() title = '';
  @Input() updatedAt = '';
}
