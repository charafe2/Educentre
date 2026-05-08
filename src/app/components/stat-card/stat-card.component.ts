import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';

export interface StatCardData {
  title: string;
  value: string;
  trendLabel: string;
  trendType: 'up' | 'down' | 'neutral';
  iconClass: string;
  iconColorClass: string;
  sparkPath: string;
  sparkColor: string;
  urgent?: boolean;
  route?: string;
}

@Component({
  selector: 'app-stat-card',
  imports: [NgClass],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.css'
})
export class StatCardComponent {
  @Input() data!: StatCardData;

  constructor(private router: Router) {}

  navigate() {
    if (this.data.route) {
      this.router.navigate([this.data.route]);
    }
  }
}
